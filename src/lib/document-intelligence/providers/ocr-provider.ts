/**
 * ElderCare OS — Provider-Independent OCR Engine Adapter
 * Supports:
 * 1. Configurable external OCR endpoint (OCR_PROVIDER_ENDPOINT)
 * 2. Built-in pure-Node PDF text-stream & UTF-8/Hindi Devanagari extractor
 * 3. Optional local Tesseract CLI (if installed on host OS)
 * Never overwrites original uploaded files.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { OcrPageResult, OcrResult } from '../types';

const execFileAsync = promisify(execFile);
const MAX_OCR_PAGES = parseInt(process.env.OCR_MAX_PAGES || '25', 10);

function detectLanguage(text: string): 'en' | 'hi' | 'mixed' | 'unknown' {
  if (!text || text.trim().length === 0) return 'unknown';
  const hasHindi = /[\u0900-\u097F]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);
  if (hasHindi && hasEnglish) return 'mixed';
  if (hasHindi) return 'hi';
  if (hasEnglish) return 'en';
  return 'unknown';
}

function decodePdfLiteralString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function extractTextFromPdfStream(content: string): string {
  const chunks: string[] = [];
  const btBlocks = content.match(/BT[\s\S]*?ET/g) || [];
  for (const block of btBlocks) {
    const tjMatches = block.match(/\((?:\\.|[^\\()])*\)\s*Tj/g) || [];
    for (const m of tjMatches) {
      const inner = m.replace(/\)\s*Tj$/, '').replace(/^\(/, '');
      chunks.push(decodePdfLiteralString(inner));
    }
    const tjArrayMatches = block.match(/\[([\s\S]*?)\]\s*TJ/g) || [];
    for (const arr of tjArrayMatches) {
      const parts = arr.match(/\((?:\\.|[^\\()])*\)/g) || [];
      chunks.push(parts.map((p) => decodePdfLiteralString(p.slice(1, -1))).join(''));
    }
  }
  return chunks.join('\n').trim();
}

function extractPdfPagesBuiltIn(buffer: Buffer): { pageCount: number; pages: OcrPageResult[]; warnings: string[] } {
  const header = buffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    throw new Error('Malformed PDF: missing %PDF- signature');
  }
  const rawLatin = buffer.toString('latin1');
  if (!rawLatin.includes('%%EOF') && !rawLatin.includes('endobj')) {
    throw new Error('Malformed PDF: missing PDF object structure');
  }

  // Count pages
  const pageMatches = rawLatin.match(/\/Type\s*\/Page\b/g) || [];
  const pageCount = Math.max(1, pageMatches.length);
  if (pageCount > MAX_OCR_PAGES) {
    throw new Error(`PDF page count (${pageCount}) exceeds maximum limit of ${MAX_OCR_PAGES} pages`);
  }

  const pageTexts: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(rawLatin)) !== null) {
    const rawStream = Buffer.from(match[1], 'latin1');
    let decoded = match[1];
    try {
      const inflated = zlib.inflateSync(rawStream);
      decoded = inflated.toString('utf8');
    } catch {
      // Not flate-compressed or raw text stream
    }
    const txt = extractTextFromPdfStream(decoded);
    if (txt) pageTexts.push(txt);
  }

  // Also check raw UTF-8 text if PDF was generated without compressed streams
  if (pageTexts.length === 0) {
    const directTxt = extractTextFromPdfStream(buffer.toString('utf8'));
    if (directTxt) pageTexts.push(directTxt);
  }

  const pages: OcrPageResult[] = [];
  for (let i = 0; i < Math.max(1, pageTexts.length); i++) {
    const text = pageTexts[i] || '';
    pages.push({
      pageNumber: i + 1,
      text,
      language: detectLanguage(text),
      tablesDetected: (text.match(/\|.*\|/g) || []).length,
    });
  }

  const warnings: string[] = [];
  if (pages.every((p) => p.text.trim().length === 0)) {
    warnings.push('No embedded text stream found (scanned/image-only PDF); manual review required.');
  }

  return { pageCount, pages, warnings };
}

async function runLocalTesseract(buffer: Buffer, mimeType: string): Promise<string | null> {
  const bin = process.env.TESSERACT_PATH?.trim() || 'tesseract';
  const ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
  const tmpFile = path.join(os.tmpdir(), `eldercare_ocr_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  try {
    fs.writeFileSync(tmpFile, buffer);
    const { stdout } = await execFileAsync(bin, [tmpFile, 'stdout', '-l', 'eng+hin'], { timeout: 25000 });
    return stdout?.trim() || null;
  } catch {
    return null;
  } finally {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      // ignore cleanup error
    }
  }
}

export async function runOcrExtraction(params: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<OcrResult> {
  const externalEndpoint = process.env.OCR_PROVIDER_ENDPOINT?.trim();
  if (externalEndpoint && process.env.ENABLE_EXTERNAL_OCR === 'true') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(externalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.OCR_PROVIDER_API_KEY
            ? { Authorization: `Bearer ${process.env.OCR_PROVIDER_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          mimeType: params.mimeType,
          fileName: params.fileName,
          contentBase64: params.buffer.toString('base64'),
          languages: ['en', 'hi'],
        }),
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        const pages: OcrPageResult[] = Array.isArray(data.pages) ? data.pages : [];
        const fullText = pages.map((p) => p.text).join('\n\n').trim();
        return {
          providerName: 'external_ocr_provider',
          readable: fullText.length > 0,
          pageCount: pages.length || 1,
          detectedLanguage: detectLanguage(fullText),
          fullText,
          pages,
          warnings: [],
        };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (params.mimeType === 'application/pdf') {
    const parsed = extractPdfPagesBuiltIn(params.buffer);
    const fullText = parsed.pages.map((p) => p.text).join('\n\n').trim();
    return {
      providerName: 'builtin_pdf_ocr',
      readable: fullText.length > 0,
      pageCount: parsed.pageCount,
      detectedLanguage: detectLanguage(fullText),
      fullText,
      pages: parsed.pages,
      warnings: parsed.warnings,
    };
  }

  // Image OCR via local Tesseract if installed
  const tessText = await runLocalTesseract(params.buffer, params.mimeType);
  if (tessText) {
    return {
      providerName: 'local_tesseract_cli',
      readable: true,
      pageCount: 1,
      detectedLanguage: detectLanguage(tessText),
      fullText: tessText,
      pages: [{ pageNumber: 1, text: tessText, language: detectLanguage(tessText), tablesDetected: 0 }],
      warnings: [],
    };
  }

  return {
    providerName: 'builtin_fallback',
    readable: false,
    pageCount: 1,
    detectedLanguage: 'unknown',
    fullText: '',
    pages: [{ pageNumber: 1, text: '', language: 'unknown', tablesDetected: 0 }],
    warnings: [
      'Image OCR engine (Tesseract CLI or OCR_PROVIDER_ENDPOINT) is not configured on this host; routed to manual review.',
    ],
  };
}
