/**
 * ElderCare OS — Local CLI Worker for OCR & Document Intelligence
 * Zero-dependency PostgreSQL worker using FOR UPDATE SKIP LOCKED (no Redis or Docker).
 *
 * Usage:
 *   node scripts/run-doc-intelligence-worker.js --once
 *   node scripts/run-doc-intelligence-worker.js --watch
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Pool } = require('pg');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const MAX_OCR_PAGES = parseInt(process.env.OCR_MAX_PAGES || '25', 10);

function getS3() {
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const region = process.env.S3_REGION?.trim() || 'ap-south-1';
  const bucket = process.env.S3_BUCKET?.trim() || 'eldercareos-tenant-storage';
  return {
    client: new S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    }),
    bucket,
  };
}

async function withTenant(orgId, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_organization_id', $1, true)", [orgId]);
    const res = await fn(client);
    await client.query('COMMIT');
    return res;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function detectLanguage(text) {
  if (!text || !text.trim()) return 'unknown';
  const hi = /[\u0900-\u097F]/.test(text);
  const en = /[a-zA-Z]/.test(text);
  if (hi && en) return 'mixed';
  if (hi) return 'hi';
  if (en) return 'en';
  return 'unknown';
}

function decodePdfLiteral(raw) {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function extractPdfText(content) {
  const chunks = [];
  for (const block of content.match(/BT[\s\S]*?ET/g) || []) {
    for (const m of block.match(/\((?:\\.|[^\\()])*\)\s*Tj/g) || []) {
      chunks.push(decodePdfLiteral(m.replace(/\)\s*Tj$/, '').replace(/^\(/, '')));
    }
    for (const arr of block.match(/\[([\s\S]*?)\]\s*TJ/g) || []) {
      const parts = arr.match(/\((?:\\.|[^\\()])*\)/g) || [];
      chunks.push(parts.map((p) => decodePdfLiteral(p.slice(1, -1))).join(''));
    }
  }
  return chunks.join('\n').trim();
}

function runBuiltInPdfOcr(buffer) {
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Malformed PDF: missing %PDF- signature');
  }
  const raw = buffer.toString('latin1');
  if (!raw.includes('%%EOF') && !raw.includes('endobj')) {
    throw new Error('Malformed PDF: missing object structure');
  }
  const pageCount = Math.max(1, (raw.match(/\/Type\s*\/Page\b/g) || []).length);
  if (pageCount > MAX_OCR_PAGES) {
    throw new Error(`PDF page count (${pageCount}) exceeds limit (${MAX_OCR_PAGES})`);
  }

  const pageTexts = [];
  const rx = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = rx.exec(raw)) !== null) {
    let decoded = m[1];
    try {
      decoded = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('utf8');
    } catch {
      // plain stream
    }
    const txt = extractPdfText(decoded);
    if (txt) pageTexts.push(txt);
  }
  if (pageTexts.length === 0) {
    const direct = extractPdfText(buffer.toString('utf8'));
    if (direct) pageTexts.push(direct);
  }

  const pages = (pageTexts.length > 0 ? pageTexts : ['']).map((text, idx) => ({
    pageNumber: idx + 1,
    text,
    language: detectLanguage(text),
    tablesDetected: (text.match(/\|.*\|/g) || []).length,
  }));
  const fullText = pages.map((p) => p.text).join('\n\n').trim();
  return {
    providerName: 'builtin_pdf_ocr',
    readable: fullText.length > 0,
    pageCount,
    detectedLanguage: detectLanguage(fullText),
    fullText,
    pages,
    warnings: fullText.length === 0 ? ['No embedded text stream found; manual review required.'] : [],
  };
}

const RULES = [
  { category: 'aadhaar_identity', patterns: [/\baadhaar\b/i, /\buidai\b/i, /आधार/], weight: 0.35 },
  { category: 'medical_prescription', patterns: [/\bprescription\b/i, /\brx\b/i, /\bdosage\b/i], weight: 0.32 },
  { category: 'discharge_summary', patterns: [/\bdischarge summary\b/i, /\bdate of discharge\b/i], weight: 0.32 },
  { category: 'medical_report', patterns: [/\bmedical report\b/i, /\bdiagnosis\b/i, /\bhospital\b/i, /\bfollow[- ]?up\b/i], weight: 0.25 },
  { category: 'admission_application', patterns: [/\badmission application\b/i, /\bapplicant\b/i, /\badmission reason\b/i], weight: 0.3 },
  { category: 'rescue_case_report', patterns: [/\brescue\b/i, /\breported location\b/i, /\bcase\s*(?:ref|number)\b/i], weight: 0.3 },
  { category: 'guardian_info', patterns: [/\bguardian\b/i, /\brelationship\b/i], weight: 0.28 },
  { category: 'consent_form', patterns: [/\bconsent\b/i, /\bdeclaration\b/i], weight: 0.28 },
  { category: 'address_proof', patterns: [/\baddress proof\b/i, /\belectricity bill\b/i, /पता/], weight: 0.25 },
  { category: 'other_identity', patterns: [/\bvoter\s*id\b/i, /\bpassport\b/i, /\bpan\s*card\b/i], weight: 0.3 },
  { category: 'financial_document', patterns: [/\bincome\b/i, /\bpension\b/i, /\b₹|inr\b/i], weight: 0.25 },
];

function classify(pages) {
  const scores = [];
  for (const rule of RULES) {
    let score = 0;
    const refs = [];
    for (const p of pages) {
      for (const pat of rule.patterns) {
        const m = p.text.match(pat);
        if (m) {
          score += rule.weight;
          if (refs.length < 3) refs.push({ pageNumber: p.pageNumber, snippet: m[0] });
        }
      }
    }
    if (score > 0) scores.push({ category: rule.category, score: Math.min(0.98, Number(score.toFixed(4))), refs });
  }
  scores.sort((a, b) => b.score - a.score);
  if (scores.length === 0) {
    return { predictedCategory: 'other', confidence: 0.25, alternatives: [], lowConfidence: true };
  }
  return {
    predictedCategory: scores[0].category,
    confidence: scores[0].score,
    alternatives: scores.slice(1, 3).map((s) => ({ category: s.category, confidence: s.score })),
    lowConfidence: scores[0].score < 0.7,
  };
}

const CATEGORY_KEYS = {
  aadhaar_identity: ['personName', 'dateOfBirth', 'gender', 'address', 'documentNumberMasked', 'issuingAuthority'],
  other_identity: ['personName', 'dateOfBirth', 'address', 'documentNumberMasked', 'issuingAuthority'],
  address_proof: ['personName', 'address', 'documentNumberMasked', 'issuingAuthority'],
  medical_prescription: ['residentReference', 'reportDate', 'hospitalOrClinic', 'doctorName', 'medicationsListed', 'followUpDate'],
  medical_report: ['residentReference', 'reportDate', 'hospitalOrClinic', 'doctorName', 'observationsListed', 'medicationsListed', 'followUpDate'],
  discharge_summary: ['residentReference', 'reportDate', 'hospitalOrClinic', 'doctorName', 'observationsListed', 'medicationsListed', 'followUpDate'],
  admission_application: ['applicantName', 'residentName', 'ageOrDob', 'gender', 'contactPhone', 'guardianName', 'emergencyContact', 'address', 'admissionReason'],
  consent_form: ['residentName', 'guardianName', 'contactPhone', 'declarationSigned', 'reportDate'],
  rescue_case_report: ['caseReference', 'personIdentifier', 'approximateAge', 'gender', 'reportedLocation', 'reportedDateTime', 'contactPhone', 'initialDescription'],
  guardian_info: ['guardianName', 'relationship', 'contactPhone', 'address', 'residentName'],
  financial_document: ['personName', 'documentNumberMasked', 'declaredAmount', 'reportDate', 'issuingAuthority'],
  other: ['personName', 'reportDate', 'notes'],
};

const FIELD_PATTERNS = {
  personName: [/(?:^|\n)\s*(?:Name|Person Name|Full Name|Applicant Name|नाम)\s*[:\-]\s*([^\n\r]{2,120})/i],
  residentName: [/(?:^|\n)\s*(?:Resident Name|Patient Name|Name of Resident)\s*[:\-]\s*([^\n\r]{2,120})/i, /(?:^|\n)\s*(?:Name)\s*[:\-]\s*([^\n\r]{2,120})/i],
  residentReference: [/(?:^|\n)\s*(?:Resident|Patient Name|Patient|Resident Ref(?:erence)?)\s*[:\-]\s*([^\n\r]{2,120})/i],
  applicantName: [/(?:^|\n)\s*(?:Applicant Name|Applicant)\s*[:\-]\s*([^\n\r]{2,120})/i],
  personIdentifier: [/(?:^|\n)\s*(?:Person|Name|Identifier)\s*[:\-]\s*([^\n\r]{2,120})/i],
  dateOfBirth: [/(?:^|\n)\s*(?:DOB|Date of Birth|Birth Date|जन्म तिथि)\s*[:\-]\s*([0-9]{1,4}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i],
  ageOrDob: [/(?:^|\n)\s*(?:Age|DOB|Date of Birth)\s*[:\-]\s*([^\n\r]{1,40})/i],
  approximateAge: [/(?:^|\n)\s*(?:Approximate Age|Approx\.?\s*Age|Age)\s*[:\-]\s*([0-9]{1,3})/i],
  gender: [/(?:^|\n)\s*(?:Gender|Sex|लिंग)\s*[:\-]\s*(Male|Female|Other|पुरुष|महिला)/i],
  address: [/(?:^|\n)\s*(?:Address|Permanent Address|Residence|पता)\s*[:\-]\s*([^\n\r]{4,240})/i],
  documentNumberMasked: [/(?:^|\n)\s*(?:Aadhaar|UID|ID Number|Document No\.?|Card No\.?)\s*[:\-]\s*([A-Z0-9\-\s]{6,24})/i],
  issuingAuthority: [/(?:^|\n)\s*(?:Issuing Authority|Issued By|Authority)\s*[:\-]\s*([^\n\r]{2,120})/i, /(Unique Identification Authority of India|UIDAI)/i],
  reportDate: [/(?:^|\n)\s*(?:Report Date|Date|Issued Date|Date of Issue)\s*[:\-]\s*([0-9]{1,4}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i],
  hospitalOrClinic: [/(?:^|\n)\s*(?:Hospital|Clinic|Medical Center|Health Center)\s*[:\-]\s*([^\n\r]{2,150})/i],
  doctorName: [/(?:^|\n)\s*(?:Doctor|Dr\.?|Physician|Clinician)\s*[:\-]\s*([^\n\r]{2,120})/i],
  observationsListed: [/(?:^|\n)\s*(?:Observations?|Clinical Notes?|Findings?|Diagnosis)\s*[:\-]\s*([^\n\r]{3,300})/i],
  medicationsListed: [/(?:^|\n)\s*(?:Medications?|Prescribed|Medicines?|Rx)\s*[:\-]\s*([^\n\r]{3,300})/i],
  followUpDate: [/(?:^|\n)\s*(?:Follow[- ]?up Date|Next Visit)\s*[:\-]\s*([0-9]{1,4}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i],
  contactPhone: [/(?:^|\n)\s*(?:Phone|Mobile|Contact|Contact Phone|Tel)\s*[:\-]\s*([+0-9\-\s]{7,20})/i],
  guardianName: [/(?:^|\n)\s*(?:Guardian|Guardian Name|Next of Kin|Caregiver)\s*[:\-]\s*([^\n\r]{2,120})/i],
  emergencyContact: [/(?:^|\n)\s*(?:Emergency Contact|Emergency Phone)\s*[:\-]\s*([^\n\r]{2,120})/i],
  admissionReason: [/(?:^|\n)\s*(?:Admission Reason|Reason for Admission|Reason)\s*[:\-]\s*([^\n\r]{3,240})/i],
  caseReference: [/(?:^|\n)\s*(?:Case Reference|Case Ref|Case No\.?|Case Number)\s*[:\-]\s*([^\n\r]{2,60})/i],
  reportedLocation: [/(?:^|\n)\s*(?:Reported Location|Location|Rescue Location|Found At)\s*[:\-]\s*([^\n\r]{3,200})/i],
  reportedDateTime: [/(?:^|\n)\s*(?:Reported Date|Date & Time|DateTime|Time)\s*[:\-]\s*([^\n\r]{4,80})/i],
  initialDescription: [/(?:^|\n)\s*(?:Description|Initial Description|Circumstances|Notes)\s*[:\-]\s*([^\n\r]{4,300})/i],
  relationship: [/(?:^|\n)\s*(?:Relationship|Relation)\s*[:\-]\s*([^\n\r]{2,60})/i],
  declarationSigned: [/(?:^|\n)\s*(?:Declaration|Signed|Consent)\s*[:\-]\s*(Yes|No|Signed|Agreed)/i],
  declaredAmount: [/(?:^|\n)\s*(?:Amount|Income|Total)\s*[:\-]\s*([₹INR0-9,.\s]{2,40})/i],
  notes: [/(?:^|\n)\s*(?:Notes|Summary|Remarks)\s*[:\-]\s*([^\n\r]{3,250})/i],
};

function extractFields(category, pages) {
  const keys = CATEGORY_KEYS[category] || CATEGORY_KEYS.other;
  const fields = {};
  const fieldConfidence = {};
  for (const key of keys) {
    let hit = null;
    for (const p of pages) {
      for (const rx of FIELD_PATTERNS[key] || []) {
        const m = p.text.match(rx);
        if (m && m[1]?.trim()) {
          hit = { value: m[1].trim(), sourceText: m[0].trim(), pageNumber: p.pageNumber };
          break;
        }
      }
      if (hit) break;
    }
    if (!hit) {
      fields[key] = { value: null, sourceText: null, pageNumber: null, boundingBox: null, confidence: 0, origin: 'extracted', verified: false };
      fieldConfidence[key] = 0;
    } else {
      let val = hit.value;
      if (key === 'documentNumberMasked') {
        const d = val.replace(/\s+/g, '');
        val = d.length >= 8 ? `${'X'.repeat(Math.max(4, d.length - 4))}${d.slice(-4)}` : d;
      } else if (key === 'approximateAge') {
        const n = parseInt(val, 10);
        if (Number.isFinite(n)) val = n;
      } else if (key === 'gender') {
        const l = val.toLowerCase();
        val = l === 'पुरुष' ? 'male' : l === 'महिला' ? 'female' : l;
      }
      fields[key] = { value: val, sourceText: hit.sourceText, pageNumber: hit.pageNumber, boundingBox: null, confidence: 0.86, origin: 'extracted', verified: false };
      fieldConfidence[key] = 0.86;
    }
  }
  return { fields, fieldConfidence };
}

const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions/i,
  /disregard\s+(?:all\s+)?(?:system|prior|above)\s+instructions/i,
  /system\s*prompt\s*:/i,
  /approve\s+(?:this\s+document\s+)?automatically/i,
  /bypass\s+(?:human\s+)?review/i,
  /override\s+(?:role|permission|security)/i,
];

async function processOrg(orgId) {
  const claimed = await withTenant(orgId, async (client) => {
    const res = await client.query(
      `SELECT j.*, d.s3_key, d.mime_type, d.file_name FROM document_processing_jobs j JOIN documents d ON j.document_id = d.id WHERE j.organization_id = $1 AND j.status = 'queued' AND j.attempt_count < j.max_attempts ORDER BY j.created_at ASC LIMIT 1 FOR UPDATE OF j SKIP LOCKED`,
      [orgId]
    );
    if (res.rows.length === 0) return null;
    await client.query(
      `UPDATE document_processing_jobs SET status = 'processing', attempt_count = attempt_count + 1, locked_at = CURRENT_TIMESTAMP, started_at = COALESCE(started_at, CURRENT_TIMESTAMP), progress_percent = 15, current_step = 'Running OCR text recognition' WHERE id = $1`,
      [res.rows[0].id]
    );
    return res.rows[0];
  });

  if (!claimed) return 0;

  try {
    const { client: s3, bucket } = getS3();
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: claimed.s3_key }));
    const buffer = Buffer.from(await obj.Body.transformToByteArray());

    const ocr =
      claimed.mime_type === 'application/pdf'
        ? runBuiltInPdfOcr(buffer)
        : {
            providerName: 'builtin_fallback',
            readable: false,
            pageCount: 1,
            detectedLanguage: 'unknown',
            fullText: '',
            pages: [{ pageNumber: 1, text: '', language: 'unknown', tablesDetected: 0 }],
            warnings: ['Image OCR engine not configured; manual review required.'],
          };

    const cls = classify(ocr.pages);
    const { fields, fieldConfidence } = extractFields(cls.predictedCategory, ocr.pages);
    const warnings = [...ocr.warnings];
    const promptInjectionDetected = INJECTION_PATTERNS.some((p) => p.test(ocr.fullText));
    if (promptInjectionDetected) {
      warnings.push('Prompt injection pattern detected in untrusted document text; manual review enforced.');
    }
    if (cls.lowConfidence) {
      warnings.push('Low classification confidence; manual review required.');
    }

    const finalStatus = !ocr.readable || cls.lowConfidence || promptInjectionDetected ? 'needs_review' : 'extracted';

    await withTenant(orgId, async (client) => {
      await client.query(
        `
        INSERT INTO document_extraction_results (
          organization_id, job_id, document_id, predicted_category,
          classification_confidence, alternative_categories, raw_text,
          pages_json, extracted_fields, field_confidence, validation_warnings,
          prompt_injection_detected, requires_manual_review
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, true)
        ON CONFLICT (job_id) DO UPDATE SET
          predicted_category = EXCLUDED.predicted_category,
          classification_confidence = EXCLUDED.classification_confidence,
          raw_text = EXCLUDED.raw_text,
          pages_json = EXCLUDED.pages_json,
          extracted_fields = EXCLUDED.extracted_fields,
          validation_warnings = EXCLUDED.validation_warnings,
          prompt_injection_detected = EXCLUDED.prompt_injection_detected;
        `,
        [
          orgId,
          claimed.id,
          claimed.document_id,
          cls.predictedCategory,
          cls.confidence,
          JSON.stringify(cls.alternatives),
          ocr.fullText,
          JSON.stringify(ocr.pages),
          JSON.stringify(fields),
          JSON.stringify(fieldConfidence),
          JSON.stringify(warnings),
          promptInjectionDetected,
        ]
      );
      await client.query(
        `UPDATE document_processing_jobs SET status = $1, provider_name = $2, progress_percent = 100, current_step = $3, page_count = $4, detected_language = $5, completed_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = $6`,
        [
          finalStatus,
          ocr.providerName,
          finalStatus === 'needs_review' ? 'Needs manual review' : 'Extraction complete — ready for review',
          ocr.pageCount,
          ocr.detectedLanguage,
          claimed.id,
        ]
      );
    });
    return 1;
  } catch (err) {
    await withTenant(orgId, async (client) => {
      await client.query(
        `UPDATE document_processing_jobs SET status = CASE WHEN attempt_count >= max_attempts THEN 'failed' ELSE 'queued' END, last_error = $1, current_step = CASE WHEN attempt_count >= max_attempts THEN 'Failed after max retries' ELSE 'Queued for retry' END WHERE id = $2`,
        [err.message || 'Processing error', claimed.id]
      );
    });
    return 0;
  }
}

async function runOnce() {
  const orgs = await pool.query('SELECT id FROM organizations');
  let processed = 0;
  for (const row of orgs.rows) {
    processed += await processOrg(row.id);
  }
  console.log(`[DocIntelligenceWorker] processedJobs=${processed}`);
}

async function main() {
  await runOnce();
  if (process.argv.includes('--watch')) {
    setInterval(() => runOnce().catch((e) => console.error('[DocIntelligenceWorker] error:', e)), 10000);
  } else {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[DocIntelligenceWorker] fatal:', err);
  process.exit(1);
});
