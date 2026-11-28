/**
 * ElderCare OS — Human Document Review & Revision History Service
 * Enforces clinical authorization boundaries for medical extractions
 * and records every edit, verification, approval, and rejection.
 */

import { withTenantContext } from '@/lib/db';
import { logTenantAudit } from '@/lib/audit';
import { MEDICAL_DOCUMENT_CATEGORIES, type DocumentCategory, type ExtractedFieldsMap } from './types';

export async function recordExtractionReview(params: {
  organizationId: string;
  jobId: string;
  reviewerId: string;
  editedFields?: Record<string, string | number | boolean | null>;
  verifiedFieldKeys?: string[];
  reviewNotes?: string;
  ipAddress?: string;
}) {
  return withTenantContext(params.organizationId, async (client) => {
    const jobRes = await client.query(
      'SELECT * FROM document_processing_jobs WHERE id = $1 AND organization_id = $2 FOR UPDATE',
      [params.jobId, params.organizationId]
    );
    if (jobRes.rows.length === 0) return { status: 404, error: 'Processing job not found' };
    const job = jobRes.rows[0];
    if (job.status === 'rejected') {
      return { status: 409, error: 'Cannot review a rejected extraction' };
    }

    const extRes = await client.query(
      'SELECT * FROM document_extraction_results WHERE job_id = $1 FOR UPDATE',
      [params.jobId]
    );
    if (extRes.rows.length === 0) {
      return { status: 404, error: 'Extraction result not found for this job' };
    }

    const ext = extRes.rows[0];
    const previousFields = (ext.extracted_fields || {}) as ExtractedFieldsMap;
    const updatedFields: ExtractedFieldsMap = JSON.parse(JSON.stringify(previousFields));

    if (params.editedFields) {
      for (const [key, val] of Object.entries(params.editedFields)) {
        const cur = updatedFields[key] || {
          value: null,
          sourceText: null,
          pageNumber: null,
          boundingBox: null,
          confidence: 1,
          origin: 'manual' as const,
          verified: false,
        };
        updatedFields[key] = {
          ...cur,
          value: val,
          origin: 'manual',
          verified: true,
        };
      }
    }

    if (params.verifiedFieldKeys) {
      for (const key of params.verifiedFieldKeys) {
        if (updatedFields[key]) {
          updatedFields[key].verified = true;
        }
      }
    }

    await client.query(
      `UPDATE document_extraction_results SET extracted_fields = $1::jsonb WHERE id = $2`,
      [JSON.stringify(updatedFields), ext.id]
    );

    const revRes = await client.query(
      `
      INSERT INTO document_review_records (
        organization_id, job_id, document_id, reviewer_id, action,
        verified_fields, edited_fields, previous_fields, review_notes
      ) VALUES ($1, $2, $3, $4, 'edited', $5::jsonb, $6::jsonb, $7::jsonb, $8)
      RETURNING *;
      `,
      [
        params.organizationId,
        params.jobId,
        job.document_id,
        params.reviewerId,
        JSON.stringify(params.verifiedFieldKeys || []),
        JSON.stringify(params.editedFields || {}),
        JSON.stringify(previousFields),
        params.reviewNotes || null,
      ]
    );

    await logTenantAudit(client, {
      organizationId: params.organizationId,
      actorId: params.reviewerId,
      action: 'document_extraction_reviewed',
      entityName: 'document_processing_jobs',
      entityId: params.jobId,
      newData: {
        editedKeys: Object.keys(params.editedFields || {}),
        verifiedKeys: params.verifiedFieldKeys || [],
      },
      ipAddress: params.ipAddress,
    });

    return { status: 200, extractedFields: updatedFields, reviewRecord: revRes.rows[0] };
  });
}

export async function approveOrRejectExtraction(params: {
  organizationId: string;
  jobId: string;
  reviewerId: string;
  roleSlug: string;
  decision: 'approve' | 'reject';
  reviewNotes?: string;
  ipAddress?: string;
}) {
  return withTenantContext(params.organizationId, async (client) => {
    const jobRes = await client.query(
      'SELECT * FROM document_processing_jobs WHERE id = $1 AND organization_id = $2 FOR UPDATE',
      [params.jobId, params.organizationId]
    );
    if (jobRes.rows.length === 0) return { status: 404, error: 'Processing job not found' };
    const job = jobRes.rows[0];

    const extRes = await client.query(
      'SELECT * FROM document_extraction_results WHERE job_id = $1',
      [params.jobId]
    );
    const ext = extRes.rows[0];

    if (params.decision === 'approve') {
      if (!ext) {
        return { status: 409, error: 'Cannot approve job without extraction results' };
      }
      if (job.status === 'rejected') {
        return { status: 409, error: 'Rejected extraction cannot be approved' };
      }
      const cat = ext.predicted_category as DocumentCategory;
      if (MEDICAL_DOCUMENT_CATEGORIES.includes(cat) && !['doctor', 'admin'].includes(params.roleSlug)) {
        return {
          status: 403,
          error: 'Forbidden: Medical document extraction approval is restricted to doctors and admins',
        };
      }
    }

    const nextStatus = params.decision === 'approve' ? 'approved' : 'rejected';
    const upd = await client.query(
      `
      UPDATE document_processing_jobs
      SET status = $1,
          current_step = $2
      WHERE id = $3
      RETURNING *;
      `,
      [
        nextStatus,
        nextStatus === 'approved' ? 'Approved by human reviewer' : 'Rejected by human reviewer',
        params.jobId,
      ]
    );

    await client.query(
      `
      INSERT INTO document_review_records (
        organization_id, job_id, document_id, reviewer_id, action, review_notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        params.organizationId,
        params.jobId,
        job.document_id,
        params.reviewerId,
        nextStatus,
        params.reviewNotes || null,
      ]
    );

    await logTenantAudit(client, {
      organizationId: params.organizationId,
      actorId: params.reviewerId,
      action: nextStatus === 'approved' ? 'document_extraction_approved' : 'document_extraction_rejected',
      entityName: 'document_processing_jobs',
      entityId: params.jobId,
      newData: { decision: nextStatus, reviewNotes: params.reviewNotes || null },
      ipAddress: params.ipAddress,
    });

    return { status: 200, job: upd.rows[0] };
  });
}
