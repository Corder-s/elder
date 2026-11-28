/**
 * ElderCare OS — Document Validation, Magic-Byte Signature Verification & Malware Scan Adapter
 */

import crypto from 'crypto';

export const ALLOWED_DOCUMENT_TYPES: Record<string, { extensions: string[]; label: string }> = {
  'application/pdf': { extensions: ['.pdf'], label: 'PDF Document' },
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], label: 'JPEG Image' },
  'image/png': { extensions: ['.png'], label: 'PNG Image' },
  'image/webp': { extensions: ['.webp'], label: 'WebP Image' },
};

export function getMaxDocumentSizeBytes(): number {
  const envVal = parseInt(process.env.DOCUMENT_MAX_SIZE_BYTES || '', 10);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : 10 * 1024 * 1024; // 10 MB default
}

export function validateUploadMetadata(params: {
  fileName: string;
  mimeType: string;
  declaredSizeBytes: number;
}): { valid: true; sanitizedFileName: string } | { valid: false; error: string } {
  const cleanName = String(params.fileName || '').trim();
  if (!cleanName || cleanName.length > 200) {
    return { valid: false, error: 'Valid fileName (1-200 chars) is required' };
  }

  const rule = ALLOWED_DOCUMENT_TYPES[params.mimeType];
  if (!rule) {
    return {
      valid: false,
      error: `Unsupported MIME type "${params.mimeType}". Allowed: PDF, JPEG, PNG, WebP.`,
    };
  }

  const lower = cleanName.toLowerCase();
  const hasValidExt = rule.extensions.some((ext) => lower.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: `File extension does not match MIME type ${params.mimeType}. Expected ${rule.extensions.join(' or ')}.`,
    };
  }

  const size = Number(params.declaredSizeBytes);
  const maxBytes = getMaxDocumentSizeBytes();
  if (!Number.isFinite(size) || size <= 0) {
    return { valid: false, error: 'File size must be a positive integer' };
  }
  if (size > maxBytes) {
    return {
      valid: false,
      error: `File size (${size} bytes) exceeds maximum allowed limit of ${maxBytes} bytes.`,
    };
  }

  const sanitizedFileName = cleanName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return { valid: true, sanitizedFileName };
}

/**
 * Verify actual file magic bytes against declared MIME type.
 */
export function validateMagicSignature(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  switch (mimeType) {
    case 'application/pdf':
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'image/jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    case 'image/webp':
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    default:
      return false;
  }
}

export function computeSha256Hex(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export interface MalwareScanResult {
  scanStatus: 'clean' | 'quarantined' | 'pending' | 'dev_bypass';
  documentStatus: 'available' | 'pending_scan' | 'rejected';
  detail: string;
}

/**
 * Malware Scanning Adapter Interface.
 * Never silently marks unscanned files as malware-free in production:
 * - If MALWARE_SCANNER_ENDPOINT is set, invokes external scanner API.
 * - In production without scanner, keeps document quarantined in `pending_scan`.
 * - In development/test (non-production) without REQUIRE_MALWARE_SCAN=true, marks `dev_bypass`.
 */
export async function evaluateMalwareScan(params: {
  objectKey: string;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<MalwareScanResult> {
  const scannerUrl = process.env.MALWARE_SCANNER_ENDPOINT?.trim();
  if (scannerUrl) {
    try {
      const res = await fetch(scannerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.clean === true) {
          return { scanStatus: 'clean', documentStatus: 'available', detail: 'External scanner clean' };
        }
        return { scanStatus: 'quarantined', documentStatus: 'rejected', detail: data?.reason || 'Threat detected' };
      }
    } catch {
      return {
        scanStatus: 'pending',
        documentStatus: 'pending_scan',
        detail: 'Malware scanner unreachable; held in quarantine',
      };
    }
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_SCAN_BYPASS !== 'true') {
    return {
      scanStatus: 'pending',
      documentStatus: 'pending_scan',
      detail: 'Production scanner not configured; file quarantined in pending_scan',
    };
  }

  if (process.env.REQUIRE_MALWARE_SCAN === 'true') {
    return {
      scanStatus: 'pending',
      documentStatus: 'pending_scan',
      detail: 'Awaiting malware scan completion',
    };
  }

  return {
    scanStatus: 'dev_bypass',
    documentStatus: 'available',
    detail: 'Development-only scan bypass policy active (not marked malware-free)',
  };
}
