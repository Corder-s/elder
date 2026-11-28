/**
 * ElderCare OS — Digital Form Generation & Operational Submission Engine
 * Generates structured drafts from human-approved extractions and submits
 * through existing operational tables/quotas without creating duplicates.
 */

import type { PoolClient } from 'pg';
import { withTenantContext } from '@/lib/db';
import { logTenantAudit } from '@/lib/audit';
import { enforceResidentQuotaTx } from '@/lib/billing/quota-service';
import { FORM_DEFINITIONS } from './schemas';
import { MEDICAL_DOCUMENT_CATEGORIES, type DocumentCategory, type ExtractedFieldsMap, type FormType } from './types';

function pickStr(fields: ExtractedFieldsMap, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = fields[k]?.value;
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return null;
}

export function mapExtractionToFormData(
  formType: FormType,
  category: DocumentCategory,
  fields: ExtractedFieldsMap
): Record<string, unknown> {
  switch (formType) {
    case 'resident_admission':
      return {
        fullName: pickStr(fields, 'residentName', 'personName', 'applicantName') || '',
        gender: (pickStr(fields, 'gender') || 'other').toLowerCase(),
        ageEstimate: fields.approximateAge?.value ?? null,
        primaryDiagnosis: pickStr(fields, 'observationsListed') || '',
        roomNumber: '',
        emergencyContactPhone: pickStr(fields, 'emergencyContact', 'contactPhone') || '',
        admissionReason: pickStr(fields, 'admissionReason') || '',
      };
    case 'resident_profile':
      return {
        fullName: pickStr(fields, 'residentName', 'personName') || '',
        dateOfBirth: pickStr(fields, 'dateOfBirth') || '',
        gender: (pickStr(fields, 'gender') || 'other').toLowerCase(),
        address: pickStr(fields, 'address') || '',
        documentNumberMasked: pickStr(fields, 'documentNumberMasked') || '',
      };
    case 'guardian_family':
      return {
        residentName: pickStr(fields, 'residentName', 'personName') || '',
        guardianName: pickStr(fields, 'guardianName') || '',
        relationship: pickStr(fields, 'relationship') || 'Guardian',
        contactPhone: pickStr(fields, 'contactPhone', 'emergencyContact') || '',
        address: pickStr(fields, 'address') || '',
      };
    case 'emergency_contact':
      return {
        residentName: pickStr(fields, 'residentName', 'personName') || '',
        contactName: pickStr(fields, 'guardianName', 'applicantName') || '',
        contactPhone: pickStr(fields, 'emergencyContact', 'contactPhone') || '',
        relationship: pickStr(fields, 'relationship') || '',
      };
    case 'rescue_registration':
      return {
        personIdentifier: pickStr(fields, 'personIdentifier', 'personName') || '',
        approximateAge: fields.approximateAge?.value ?? null,
        gender: (pickStr(fields, 'gender') || 'other').toLowerCase(),
        rescueLocation: pickStr(fields, 'reportedLocation', 'address') || '',
        reportedByPhone: pickStr(fields, 'contactPhone') || '',
        urgencyLevel: 'medium',
        notes: pickStr(fields, 'initialDescription', 'notes') || '',
      };
    case 'document_verification':
      return {
        documentCategory: category,
        personName: pickStr(fields, 'personName', 'residentName') || '',
        issuingAuthority: pickStr(fields, 'issuingAuthority') || '',
        identityMatched: false,
        verificationNotes: '',
      };
    case 'medical_summary_review':
      return {
        residentReference: pickStr(fields, 'residentReference', 'residentName', 'personName') || '',
        reportDate: pickStr(fields, 'reportDate') || '',
        hospitalOrClinic: pickStr(fields, 'hospitalOrClinic') || '',
        doctorName: pickStr(fields, 'doctorName') || '',
        observationsListed: pickStr(fields, 'observationsListed') || '',
        medicationsListed: pickStr(fields, 'medicationsListed') || '',
        clinicianVerified: false,
      };
  }
}

export function validateFormData(formType: FormType, formData: Record<string, unknown>): string[] {
  const def = FORM_DEFINITIONS[formType];
  if (!def) return [`Unsupported form type: ${formType}`];
  const errors: string[] = [];

  for (const field of def.fields) {
    if (field.conditionalOn) {
      if (formData[field.conditionalOn.field] !== field.conditionalOn.equals) {
        continue;
      }
    }
    const val = formData[field.key];
    if (field.required) {
      if (field.type === 'checkbox') {
        if (val !== true) errors.push(`${field.label} must be confirmed`);
      } else if (val === null || val === undefined || String(val).trim() === '') {
        errors.push(`${field.label} is required`);
      }
    }
    if (field.maxLength && typeof val === 'string' && val.length > field.maxLength) {
      errors.push(`${field.label} exceeds max length of ${field.maxLength}`);
    }
  }
  return errors;
}

export async function createFormDraftFromJob(params: {
  organizationId: string;
  jobId: string;
  formType: FormType;
  actorUserId: string;
  ipAddress?: string;
}) {
  const def = FORM_DEFINITIONS[params.formType];
  if (!def) throw new Error('Unsupported form type');

  return withTenantContext(params.organizationId, async (client) => {
    const jobRes = await client.query(
      `
      SELECT j.*, r.predicted_category, r.extracted_fields
      FROM document_processing_jobs j
      JOIN document_extraction_results r ON r.job_id = j.id
      WHERE j.id = $1 AND j.organization_id = $2
      `,
      [params.jobId, params.organizationId]
    );
    if (jobRes.rows.length === 0) {
      throw new Error('Processing job or extraction result not found');
    }
    const job = jobRes.rows[0];
    if (job.status !== 'approved') {
      throw new Error(`Cannot generate digital form: job status is "${job.status}". Human approval is required first.`);
    }

    const formData = mapExtractionToFormData(
      params.formType,
      job.predicted_category as DocumentCategory,
      (job.extracted_fields || {}) as ExtractedFieldsMap
    );
    const errors = validateFormData(params.formType, formData);

    const ins = await client.query(
      `
      INSERT INTO generated_form_drafts (
        organization_id, source_document_id, source_job_id, form_type, form_version,
        title, status, schema_definition, form_data, validation_errors, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7::jsonb, $8::jsonb, $9::jsonb, $10)
      RETURNING *;
      `,
      [
        params.organizationId,
        job.document_id,
        job.id,
        params.formType,
        def.version,
        def.title,
        JSON.stringify(def),
        JSON.stringify(formData),
        JSON.stringify(errors),
        params.actorUserId,
      ]
    );

    await logTenantAudit(client, {
      organizationId: params.organizationId,
      actorId: params.actorUserId,
      action: 'digital_form_draft_created',
      entityName: 'generated_form_drafts',
      entityId: ins.rows[0].id,
      newData: { formType: params.formType, sourceJobId: job.id },
      ipAddress: params.ipAddress,
    });

    return ins.rows[0];
  });
}

export async function submitFormDraftToOperations(params: {
  organizationId: string;
  draftId: string;
  actorUserId: string;
  roleSlug: string;
  branchId?: string | null;
  ipAddress?: string;
}) {
  return withTenantContext(params.organizationId, async (client: PoolClient) => {
    const res = await client.query(
      'SELECT * FROM generated_form_drafts WHERE id = $1 AND organization_id = $2 FOR UPDATE',
      [params.draftId, params.organizationId]
    );
    if (res.rows.length === 0) {
      return { status: 404, error: 'Form draft not found' };
    }
    const draft = res.rows[0];
    if (draft.status === 'submitted') {
      return { status: 409, error: 'Duplicate submission prevented: form draft has already been submitted' };
    }
    if (draft.status === 'rejected') {
      return { status: 409, error: 'Cannot submit a rejected form draft' };
    }

    const formType = draft.form_type as FormType;
    const def = FORM_DEFINITIONS[formType];
    const formData = (draft.form_data || {}) as Record<string, any>;

    // Medical summary review requires doctor or admin
    if (
      (def?.requiresClinicalReview || MEDICAL_DOCUMENT_CATEGORIES.includes(formData.documentCategory)) &&
      !['doctor', 'admin'].includes(params.roleSlug)
    ) {
      return { status: 403, error: 'Forbidden: Only authorized doctors or admins may submit clinical summary forms' };
    }

    const errors = validateFormData(formType, formData);
    if (errors.length > 0) {
      return { status: 400, error: `Form validation failed: ${errors.join('; ')}`, validationErrors: errors };
    }

    let targetEntityType = 'generated_form_drafts';
    let targetEntityId: string = draft.id;

    if (formType === 'resident_admission') {
      const quota = await enforceResidentQuotaTx(client, params.organizationId);
      if (!quota.allowed) {
        return { status: 403, error: quota.errorMessage || 'Resident quota reached' };
      }

      const numRes = await client.query(
        `SELECT COALESCE(MAX(SUBSTRING(resident_number FROM '[0-9]+')::integer), 0) + 1 AS next_num FROM residents`
      );
      const residentNumber = `RES-${String(numRes.rows[0].next_num).padStart(3, '0')}`;
      const rIns = await client.query(
        `
        INSERT INTO residents (
          organization_id, branch_id, resident_number, full_name, age_estimate, gender,
          resident_status, room_number, primary_diagnosis, emergency_contact, admitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING id;
        `,
        [
          params.organizationId,
          params.branchId || null,
          residentNumber,
          String(formData.fullName).trim(),
          formData.ageEstimate ? Number(formData.ageEstimate) : null,
          String(formData.gender || 'other').toLowerCase(),
          formData.roomNumber || null,
          formData.primaryDiagnosis || null,
          formData.emergencyContactPhone ? JSON.stringify({ phone: formData.emergencyContactPhone }) : null,
        ]
      );
      targetEntityType = 'residents';
      targetEntityId = rIns.rows[0].id;
    } else if (formType === 'rescue_registration') {
      const numRes = await client.query(
        `SELECT COALESCE(MAX(SUBSTRING(case_number FROM '[0-9]+')::integer), 0) + 1 AS next_num FROM rescue_cases`
      );
      const caseNumber = `RC-${String(numRes.rows[0].next_num).padStart(3, '0')}`;
      const rcIns = await client.query(
        `
        INSERT INTO rescue_cases (
          organization_id, branch_id, case_number, person_identifier, approximate_age,
          gender, rescue_location, reported_by_phone, urgency_level, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'reported')
        RETURNING id;
        `,
        [
          params.organizationId,
          params.branchId || null,
          caseNumber,
          String(formData.personIdentifier).trim(),
          formData.approximateAge ? Number(formData.approximateAge) : null,
          String(formData.gender || 'other').toLowerCase(),
          String(formData.rescueLocation).trim(),
          formData.reportedByPhone || null,
          formData.urgencyLevel || 'medium',
          formData.notes || null,
        ]
      );
      targetEntityType = 'rescue_cases';
      targetEntityId = rcIns.rows[0].id;
    }

    const upd = await client.query(
      `
      UPDATE generated_form_drafts
      SET status = 'submitted',
          submitted_by = $1,
          submitted_at = CURRENT_TIMESTAMP,
          target_entity_type = $2,
          target_entity_id = $3
      WHERE id = $4
      RETURNING *;
      `,
      [params.actorUserId, targetEntityType, targetEntityId, draft.id]
    );

    await logTenantAudit(client, {
      organizationId: params.organizationId,
      actorId: params.actorUserId,
      action: 'digital_form_submitted',
      entityName: targetEntityType,
      entityId: targetEntityId,
      newData: { draftId: draft.id, formType },
      ipAddress: params.ipAddress,
    });

    return { status: 200, draft: upd.rows[0], targetEntityType, targetEntityId };
  });
}
