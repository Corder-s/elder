/**
 * ElderCare OS — Document Intelligence Processing Pipeline & Quota Guard
 * Handles job queueing (idempotent), subscription quota enforcement,
 * safe worker claiming (FOR UPDATE SKIP LOCKED), OCR -> Classification -> Extraction -> Validation.
 */

import { getDbPool, withTenantContext } from '@/lib/db';
import { logTenantAudit } from '@/lib/audit';
import { getStorageObjectBuffer } from '@/lib/storage/s3-client';
import { evaluateHealthcareSafetyPolicy, type LifecycleStatus } from '@/lib/billing/entitlements';
import { runOcrExtraction } from './providers/ocr-provider';
import { classifyDocument } from './document-classifier';
import { extractStructuredFields } from './field-extractor';
import { validateExtractionResult } from './validation-engine';

const PLAN_MONTHLY_DOC_AI_QUOTAS: Record<string, number> = {
  starter: 50,
  'vault-micro': 25,
  professional: 500,
  enterprise: 5000,
};

export async function enqueueDocumentProcessingJob(params: {
  organizationId: string;
  documentId: string;
  requestedBy: string;
  forceReprocess?: boolean;
  ipAddress?: string;
}) {
  return withTenantContext(params.organizationId, async (client) => {
    // 1. Verify document exists, belongs to org, and is in a processable state
    const docRes = await client.query('SELECT * FROM documents WHERE id = $1 AND is_deleted = false', [
      params.documentId,
    ]);
    if (docRes.rows.length === 0) {
      return { status: 404, error: 'Document not found' };
    }
    const doc = docRes.rows[0];
    if (doc.document_status !== 'available') {
      return {
        status: 409,
        error: `Document cannot be processed in status "${doc.document_status}". Complete upload and scan first.`,
      };
    }

    // 2. Idempotency check unless forceReprocess is requested
    if (!params.forceReprocess) {
      const existing = await client.query(
        `
        SELECT * FROM document_processing_jobs
        WHERE organization_id = $1 AND document_id = $2
          AND status IN ('queued', 'processing', 'extracted', 'needs_review', 'approved')
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [params.organizationId, params.documentId]
      );
      if (existing.rows.length > 0) {
        return { status: 200, idempotent: true, job: existing.rows[0] };
      }
    }

    // 3. Enforce subscription entitlement & monthly processing quota
    const subRes = await client.query(
      `
      SELECT ts.status, sp.slug
      FROM tenant_subscriptions ts
      JOIN subscription_plans sp ON ts.plan_id = sp.id
      WHERE ts.organization_id = $1
      FOR UPDATE OF ts
      `,
      [params.organizationId]
    );
    const sub = subRes.rows[0];
    if (sub) {
      const policy = evaluateHealthcareSafetyPolicy(sub.status as LifecycleStatus);
      if (!policy.allowPremiumFeatures) {
        return {
          status: 403,
          error: `Document intelligence is paused while subscription is ${sub.status}.`,
        };
      }
      const monthlyLimit = PLAN_MONTHLY_DOC_AI_QUOTAS[sub.slug] ?? 50;
      const countRes = await client.query(
        `
        SELECT count(*)::int AS cnt
        FROM document_processing_jobs
        WHERE organization_id = $1
          AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
        `,
        [params.organizationId]
      );
      if (countRes.rows[0].cnt >= monthlyLimit) {
        return {
          status: 403,
          error: `Monthly document intelligence quota reached (${countRes.rows[0].cnt}/${monthlyLimit}). Upgrade plan to process more documents.`,
          quotaExceeded: true,
        };
      }
    }

    // 4. Create queued job
    const jobRes = await client.query(
      `
      INSERT INTO document_processing_jobs (
        organization_id, document_id, requested_by, status, progress_percent, current_step
      ) VALUES ($1, $2, $3, 'queued', 0, 'Queued for OCR')
      RETURNING *;
      `,
      [params.organizationId, params.documentId, params.requestedBy]
    );

    await logTenantAudit(client, {
      organizationId: params.organizationId,
      actorId: params.requestedBy,
      action: 'document_intelligence_queued',
      entityName: 'document_processing_jobs',
      entityId: jobRes.rows[0].id,
      newData: { documentId: params.documentId },
      ipAddress: params.ipAddress,
    });

    return { status: 201, idempotent: false, job: jobRes.rows[0] };
  });
}

export async function processNextDocumentJobForOrg(organizationId: string) {
  const claimed = await withTenantContext(organizationId, async (client) => {
    const res = await client.query(
      `
      SELECT j.*, d.s3_key, d.mime_type, d.file_name
      FROM document_processing_jobs j
      JOIN documents d ON j.document_id = d.id
      WHERE j.organization_id = $1
        AND j.status = 'queued'
        AND j.attempt_count < j.max_attempts
      ORDER BY j.created_at ASC
      LIMIT 1
      FOR UPDATE OF j SKIP LOCKED
      `,
      [organizationId]
    );
    if (res.rows.length === 0) return null;

    const job = res.rows[0];
    const timeoutAt = new Date(Date.now() + 60 * 1000);
    await client.query(
      `
      UPDATE document_processing_jobs
      SET status = 'processing',
          attempt_count = attempt_count + 1,
          locked_at = CURRENT_TIMESTAMP,
          started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
          timeout_at = $1,
          progress_percent = 15,
          current_step = 'Running OCR text recognition'
      WHERE id = $2
      `,
      [timeoutAt, job.id]
    );
    return job;
  });

  if (!claimed) return null;

  try {
    const buffer = await getStorageObjectBuffer(claimed.s3_key);
    const ocr = await runOcrExtraction({
      buffer,
      mimeType: claimed.mime_type,
      fileName: claimed.file_name,
    });

    const classification = classifyDocument(ocr.pages);
    const { fields, fieldConfidence } = extractStructuredFields(
      classification.predictedCategory,
      ocr.pages
    );
    const validation = validateExtractionResult({ ocr, classification, fields });

    const finalJobStatus =
      !ocr.readable || classification.lowConfidence || validation.promptInjectionDetected
        ? 'needs_review'
        : 'extracted';

    const saved = await withTenantContext(organizationId, async (client) => {
      await client.query(
        `
        INSERT INTO document_extraction_results (
          organization_id, job_id, document_id, predicted_category,
          classification_confidence, alternative_categories, raw_text,
          pages_json, extracted_fields, field_confidence, validation_warnings,
          prompt_injection_detected, requires_manual_review
        ) VALUES (
          $1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13
        )
        ON CONFLICT (job_id) DO UPDATE SET
          predicted_category = EXCLUDED.predicted_category,
          classification_confidence = EXCLUDED.classification_confidence,
          alternative_categories = EXCLUDED.alternative_categories,
          raw_text = EXCLUDED.raw_text,
          pages_json = EXCLUDED.pages_json,
          extracted_fields = EXCLUDED.extracted_fields,
          field_confidence = EXCLUDED.field_confidence,
          validation_warnings = EXCLUDED.validation_warnings,
          prompt_injection_detected = EXCLUDED.prompt_injection_detected,
          requires_manual_review = EXCLUDED.requires_manual_review;
        `,
        [
          organizationId,
          claimed.id,
          claimed.document_id,
          classification.predictedCategory,
          classification.confidence,
          JSON.stringify(classification.alternativeCategories),
          ocr.fullText,
          JSON.stringify(ocr.pages),
          JSON.stringify(fields),
          JSON.stringify(fieldConfidence),
          JSON.stringify(validation.warnings),
          validation.promptInjectionDetected,
          validation.requiresManualReview,
        ]
      );

      const upd = await client.query(
        `
        UPDATE document_processing_jobs
        SET status = $1,
            provider_name = $2,
            progress_percent = 100,
            current_step = $3,
            page_count = $4,
            detected_language = $5,
            completed_at = CURRENT_TIMESTAMP,
            last_error = NULL
        WHERE id = $6
        RETURNING *;
        `,
        [
          finalJobStatus,
          ocr.providerName,
          finalJobStatus === 'needs_review' ? 'Needs manual review' : 'Extraction complete — ready for review',
          ocr.pageCount,
          ocr.detectedLanguage,
          claimed.id,
        ]
      );

      return upd.rows[0];
    });

    return saved;
  } catch (err: any) {
    const errMsg = err?.message || 'Document intelligence processing failed';
    await withTenantContext(organizationId, async (client) => {
      await client.query(
        `
        UPDATE document_processing_jobs
        SET status = CASE WHEN attempt_count >= max_attempts THEN 'failed' ELSE 'queued' END,
            last_error = $1,
            current_step = CASE WHEN attempt_count >= max_attempts THEN 'Failed after max retries' ELSE 'Queued for retry' END
        WHERE id = $2
        `,
        [errMsg, claimed.id]
      );
    });
    return { id: claimed.id, status: 'failed', error: errMsg };
  }
}

export async function runDocIntelligenceWorkerBatch(): Promise<{ processedCount: number }> {
  const pool = getDbPool();
  const orgs = await pool.query('SELECT id FROM organizations');
  let processedCount = 0;

  for (const row of orgs.rows) {
    const res = await processNextDocumentJobForOrg(row.id);
    if (res) processedCount++;
  }

  return { processedCount };
}
