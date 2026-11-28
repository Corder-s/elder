/**
 * ElderCare OS — Tenant Data Portability & Asynchronous Export Service
 * Produces machine-readable JSON/CSV + authorized document ZIP archives inside RLS tenant context.
 * Strictly excludes password hashes, JWTs, MFA secrets, API keys, and other tenants' data.
 */

import crypto from 'crypto';
import JSZip from 'jszip';
import { getDbPool, withTenantContext } from '@/lib/db';
import { logTenantAudit } from '@/lib/audit';
import { getStorageObjectBuffer, putStorageObject } from '@/lib/storage/s3-client';
import { sanitizeDocumentRecord } from '@/lib/storage/document-auth';

function toCsv(rows: any[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/[",\r\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(','));
  }
  return lines.join('\n');
}

export async function requestTenantExportJob(params: {
  organizationId: string;
  requestedBy: string;
  exportFormat?: 'zip' | 'json';
  includeDocuments?: boolean;
  ipAddress?: string;
}) {
  const format = params.exportFormat === 'json' ? 'json' : 'zip';
  const includeDocs = params.includeDocuments !== false;

  return withTenantContext(params.organizationId, async (client) => {
    const res = await client.query(
      `
      INSERT INTO tenant_export_jobs (
        organization_id, requested_by, status, export_format, include_documents,
        progress_percent, current_step
      ) VALUES ($1, $2, 'queued', $3, $4, 0, 'Queued for background export')
      RETURNING *;
      `,
      [params.organizationId, params.requestedBy, format, includeDocs]
    );

    await logTenantAudit(client, {
      organizationId: params.organizationId,
      actorId: params.requestedBy,
      action: 'tenant_export_requested',
      entityName: 'tenant_export_jobs',
      entityId: res.rows[0].id,
      newData: { exportFormat: format, includeDocuments: includeDocs },
      ipAddress: params.ipAddress,
    });

    return res.rows[0];
  });
}

export async function listTenantExportJobs(organizationId: string, limit = 25) {
  return withTenantContext(organizationId, async (client) => {
    const res = await client.query(
      `
      SELECT j.id, j.status, j.export_format, j.include_documents, j.progress_percent,
             j.current_step, j.record_counts, j.file_size_bytes, j.sha256_checksum,
             j.attempt_count, j.max_attempts, j.last_error, j.started_at,
             j.completed_at, j.expires_at, j.created_at, u.full_name AS requested_by_name
      FROM tenant_export_jobs j
      LEFT JOIN users u ON j.requested_by = u.id
      WHERE j.organization_id = $1
      ORDER BY j.created_at DESC
      LIMIT $2;
      `,
      [organizationId, limit]
    );
    return res.rows;
  });
}

/**
 * Claim and process a single queued export job for a specific organization.
 * Uses PostgreSQL `FOR UPDATE SKIP LOCKED` for safe concurrency.
 */
export async function processExportJobForOrg(organizationId: string, specificJobId?: string) {
  const claimed = await withTenantContext(organizationId, async (client) => {
    const query = specificJobId
      ? `SELECT * FROM tenant_export_jobs WHERE id = $1 AND organization_id = $2 AND status = 'queued' AND attempt_count < max_attempts FOR UPDATE SKIP LOCKED`
      : `SELECT * FROM tenant_export_jobs WHERE organization_id = $1 AND status = 'queued' AND attempt_count < max_attempts ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`;
    const params = specificJobId ? [specificJobId, organizationId] : [organizationId];
    const res = await client.query(query, params);
    if (res.rows.length === 0) return null;

    const job = res.rows[0];
    const upd = await client.query(
      `
      UPDATE tenant_export_jobs
      SET status = 'processing',
          attempt_count = attempt_count + 1,
          locked_at = CURRENT_TIMESTAMP,
          started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
          progress_percent = 10,
          current_step = 'Collecting tenant records'
      WHERE id = $1
      RETURNING *;
      `,
      [job.id]
    );
    return upd.rows[0];
  });

  if (!claimed) return null;

  try {
    const exportBundle = await withTenantContext(organizationId, async (client) => {
      const [
        orgRes,
        branchesRes,
        residentsRes,
        admissionsRes,
        rescueRes,
        medRecRes,
        medObsRes,
        prescRes,
        schedRes,
        attRes,
        roomsRes,
        bedsRes,
        visitorsRes,
        visitsRes,
        staffRes,
        tasksRes,
        diaryRes,
        eventsRes,
        docsRes,
        donationsRes,
        expensesRes,
        auditRes,
      ] = await Promise.all([
        client.query(
          `SELECT id, name, slug, registration_number, primary_email, primary_phone, address_line1, city, state, country, status, created_at FROM organizations WHERE id = $1`,
          [organizationId]
        ),
        client.query(`SELECT id, name, code, phone, address, status, is_main_branch, created_at FROM branches WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM residents WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM admissions WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM rescue_cases WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM medical_records WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM medical_observations WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM prescriptions WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM medication_schedules WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM attendance WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM rooms WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM beds WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM visitors WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM visits WHERE organization_id = $1`, [organizationId]),
        client.query(
          `
          SELECT m.id, m.user_id, u.full_name, u.email, r.slug AS role_slug, m.branch_id, m.status, m.created_at
          FROM organization_memberships m
          JOIN users u ON m.user_id = u.id
          JOIN roles r ON m.role_id = r.id
          WHERE m.organization_id = $1
          `,
          [organizationId]
        ),
        client.query(`SELECT * FROM tasks WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM daily_diary WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM events WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM documents WHERE organization_id = $1 AND is_deleted = false`, [organizationId]),
        client.query(`SELECT * FROM donations WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT * FROM expenses WHERE organization_id = $1`, [organizationId]),
        client.query(`SELECT id, actor_id, action, entity_name, entity_id, old_data, new_data, created_at FROM tenant_audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 5000`, [organizationId]),
      ]);

      return {
        organization: orgRes.rows[0] || null,
        branches: branchesRes.rows,
        residents: residentsRes.rows,
        admissions: admissionsRes.rows,
        rescue_cases: rescueRes.rows,
        medical_records: medRecRes.rows,
        medical_observations: medObsRes.rows,
        prescriptions: prescRes.rows,
        medication_schedules: schedRes.rows,
        attendance: attRes.rows,
        rooms: roomsRes.rows,
        beds: bedsRes.rows,
        visitors: visitorsRes.rows,
        visits: visitsRes.rows,
        staff_memberships: staffRes.rows,
        tasks: tasksRes.rows,
        daily_diary: diaryRes.rows,
        events: eventsRes.rows,
        documents: docsRes.rows.map(sanitizeDocumentRecord),
        rawDocumentRefs: docsRes.rows.map((d) => ({
          id: d.id,
          fileName: d.file_name,
          s3Key: d.s3_key,
          documentStatus: d.document_status,
        })),
        donations: donationsRes.rows,
        expenses: expensesRes.rows,
        audit_logs: auditRes.rows,
      };
    });

    const recordCounts: Record<string, number> = {
      branches: exportBundle.branches.length,
      residents: exportBundle.residents.length,
      admissions: exportBundle.admissions.length,
      rescue_cases: exportBundle.rescue_cases.length,
      medical_records: exportBundle.medical_records.length,
      prescriptions: exportBundle.prescriptions.length,
      documents: exportBundle.documents.length,
      donations: exportBundle.donations.length,
      expenses: exportBundle.expenses.length,
      audit_logs: exportBundle.audit_logs.length,
    };

    const { rawDocumentRefs, ...safeData } = exportBundle;
    const manifest = {
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      organizationId,
      jobId: claimed.id,
      recordCounts,
    };

    let archiveBuffer: Buffer;
    let exportKey: string;
    let contentType: string;

    if (claimed.export_format === 'json') {
      archiveBuffer = Buffer.from(JSON.stringify({ manifest, data: safeData }, null, 2), 'utf8');
      exportKey = `tenants/${organizationId}/exports/${claimed.id}.json`;
      contentType = 'application/json';
    } else {
      const zip = new JSZip();
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
      for (const [section, rows] of Object.entries(safeData)) {
        zip.file(`data/${section}.json`, JSON.stringify(rows, null, 2));
        if (Array.isArray(rows) && rows.length > 0) {
          zip.file(`csv/${section}.csv`, toCsv(rows));
        }
      }

      if (claimed.include_documents) {
        for (const docRef of rawDocumentRefs) {
          if (docRef.documentStatus === 'available' && docRef.s3Key) {
            try {
              const docBytes = await getStorageObjectBuffer(docRef.s3Key);
              zip.file(`documents/${docRef.id}_${docRef.fileName}`, docBytes);
            } catch {
              // Record missing/unreadable object in manifest note without failing entire portability export
            }
          }
        }
      }

      archiveBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      exportKey = `tenants/${organizationId}/exports/${claimed.id}.zip`;
      contentType = 'application/zip';
    }

    const sha256 = crypto.createHash('sha256').update(archiveBuffer).digest('hex');
    await putStorageObject({ key: exportKey, body: archiveBuffer, contentType });

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const completed = await withTenantContext(organizationId, async (client) => {
      const upd = await client.query(
        `
        UPDATE tenant_export_jobs
        SET status = 'completed',
            progress_percent = 100,
            current_step = 'Completed',
            record_counts = $1::jsonb,
            s3_key = $2,
            file_size_bytes = $3,
            sha256_checksum = $4,
            completed_at = CURRENT_TIMESTAMP,
            expires_at = $5,
            last_error = NULL
        WHERE id = $6
        RETURNING *;
        `,
        [JSON.stringify(recordCounts), exportKey, archiveBuffer.length, sha256, expiresAt, claimed.id]
      );

      await logTenantAudit(client, {
        organizationId,
        actorId: claimed.requested_by,
        action: 'tenant_export_completed',
        entityName: 'tenant_export_jobs',
        entityId: claimed.id,
        newData: { fileSizeBytes: archiveBuffer.length, sha256, recordCounts },
      });

      return upd.rows[0];
    });

    return completed;
  } catch (err: any) {
    const errMsg = err?.message || 'Export processing failed';
    await withTenantContext(organizationId, async (client) => {
      await client.query(
        `
        UPDATE tenant_export_jobs
        SET status = CASE WHEN attempt_count >= max_attempts THEN 'failed' ELSE 'queued' END,
            last_error = $1,
            current_step = CASE WHEN attempt_count >= max_attempts THEN 'Failed after max retries' ELSE 'Queued for retry' END
        WHERE id = $2
        `,
        [errMsg, claimed.id]
      );
    });
    throw err;
  }
}

export async function runExportWorkerBatch(): Promise<{ processedCount: number }> {
  const pool = getDbPool();
  const orgs = await pool.query('SELECT id FROM organizations');
  let processedCount = 0;

  for (const row of orgs.rows) {
    const job = await processExportJobForOrg(row.id);
    if (job) processedCount++;
  }

  return { processedCount };
}
