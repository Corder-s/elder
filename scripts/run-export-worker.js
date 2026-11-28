/**
 * ElderCare OS — Local CLI Worker for Tenant Data Exports & Retention Cleanup
 * Zero-dependency Node.js worker (no Redis or Docker required).
 *
 * Usage:
 *   node scripts/run-export-worker.js --once
 *   node scripts/run-export-worker.js --watch
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const JSZip = require('jszip');
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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

function getS3() {
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const region = process.env.S3_REGION?.trim() || 'ap-south-1';
  const bucket = process.env.S3_BUCKET?.trim() || 'eldercareos-tenant-storage';
  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  });
  return { client, bucket };
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

function toCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

async function processOrgJobs(orgId) {
  const claimed = await withTenant(orgId, async (client) => {
    const res = await client.query(
      `SELECT * FROM tenant_export_jobs WHERE organization_id = $1 AND status = 'queued' AND attempt_count < max_attempts ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [orgId]
    );
    if (res.rows.length === 0) return null;
    const upd = await client.query(
      `UPDATE tenant_export_jobs SET status = 'processing', attempt_count = attempt_count + 1, locked_at = CURRENT_TIMESTAMP, started_at = COALESCE(started_at, CURRENT_TIMESTAMP), progress_percent = 10, current_step = 'Collecting tenant records' WHERE id = $1 RETURNING *`,
      [res.rows[0].id]
    );
    return upd.rows[0];
  });

  if (!claimed) return 0;

  const { client: s3, bucket } = getS3();

  try {
    const bundle = await withTenant(orgId, async (client) => {
      const [org, branches, residents, admissions, rescue, medRec, medObs, presc, sched, att, rooms, beds, visitors, visits, staff, tasks, diary, events, docs, donations, expenses, audits] =
        await Promise.all([
          client.query(`SELECT id, name, slug, registration_number, primary_email, primary_phone, address_line1, city, state, country, status, created_at FROM organizations WHERE id = $1`, [orgId]),
          client.query(`SELECT id, name, code, phone, address, status, is_main_branch, created_at FROM branches WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM residents WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM admissions WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM rescue_cases WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM medical_records WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM medical_observations WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM prescriptions WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM medication_schedules WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM attendance WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM rooms WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM beds WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM visitors WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM visits WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT m.id, m.user_id, u.full_name, u.email, r.slug AS role_slug, m.branch_id, m.status, m.created_at FROM organization_memberships m JOIN users u ON m.user_id = u.id JOIN roles r ON m.role_id = r.id WHERE m.organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM tasks WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM daily_diary WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM events WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT id, title, document_type, file_name, file_size_bytes, mime_type, is_confidential, document_status, scan_status, sha256_checksum, resident_id, rescue_case_id, branch_id, created_at, s3_key FROM documents WHERE organization_id = $1 AND is_deleted = false`, [orgId]),
          client.query(`SELECT * FROM donations WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT * FROM expenses WHERE organization_id = $1`, [orgId]),
          client.query(`SELECT id, actor_id, action, entity_name, entity_id, old_data, new_data, created_at FROM tenant_audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 5000`, [orgId]),
        ]);

      const rawDocs = docs.rows;
      const safeDocs = rawDocs.map(({ s3_key, ...rest }) => rest);
      return {
        data: {
          organization: org.rows[0] || null,
          branches: branches.rows,
          residents: residents.rows,
          admissions: admissions.rows,
          rescue_cases: rescue.rows,
          medical_records: medRec.rows,
          medical_observations: medObs.rows,
          prescriptions: presc.rows,
          medication_schedules: sched.rows,
          attendance: att.rows,
          rooms: rooms.rows,
          beds: beds.rows,
          visitors: visitors.rows,
          visits: visits.rows,
          staff_memberships: staff.rows,
          tasks: tasks.rows,
          daily_diary: diary.rows,
          events: events.rows,
          documents: safeDocs,
          donations: donations.rows,
          expenses: expenses.rows,
          audit_logs: audits.rows,
        },
        rawDocs,
      };
    });

    const recordCounts = {
      branches: bundle.data.branches.length,
      residents: bundle.data.residents.length,
      documents: bundle.data.documents.length,
      audit_logs: bundle.data.audit_logs.length,
    };
    const manifest = { schemaVersion: '1.0', exportedAt: new Date().toISOString(), organizationId: orgId, jobId: claimed.id, recordCounts };

    let archiveBuffer;
    let exportKey;
    let contentType;

    if (claimed.export_format === 'json') {
      archiveBuffer = Buffer.from(JSON.stringify({ manifest, data: bundle.data }, null, 2), 'utf8');
      exportKey = `tenants/${orgId}/exports/${claimed.id}.json`;
      contentType = 'application/json';
    } else {
      const zip = new JSZip();
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
      for (const [k, rows] of Object.entries(bundle.data)) {
        zip.file(`data/${k}.json`, JSON.stringify(rows, null, 2));
        if (Array.isArray(rows) && rows.length > 0) zip.file(`csv/${k}.csv`, toCsv(rows));
      }
      if (claimed.include_documents) {
        for (const d of bundle.rawDocs) {
          if (d.document_status === 'available' && d.s3_key) {
            try {
              const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: d.s3_key }));
              if (obj.Body) {
                const bytes = await obj.Body.transformToByteArray();
                zip.file(`documents/${d.id}_${d.file_name}`, Buffer.from(bytes));
              }
            } catch {
              // ignore missing object
            }
          }
        }
      }
      archiveBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      exportKey = `tenants/${orgId}/exports/${claimed.id}.zip`;
      contentType = 'application/zip';
    }

    const sha256 = crypto.createHash('sha256').update(archiveBuffer).digest('hex');
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: exportKey, Body: archiveBuffer, ContentType: contentType }));

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await withTenant(orgId, async (client) => {
      await client.query(
        `UPDATE tenant_export_jobs SET status = 'completed', progress_percent = 100, current_step = 'Completed', record_counts = $1::jsonb, s3_key = $2, file_size_bytes = $3, sha256_checksum = $4, completed_at = CURRENT_TIMESTAMP, expires_at = $5, last_error = NULL WHERE id = $6`,
        [JSON.stringify(recordCounts), exportKey, archiveBuffer.length, sha256, expiresAt, claimed.id]
      );
      await client.query(
        `INSERT INTO tenant_audit_logs (organization_id, actor_id, action, entity_name, entity_id, new_data) VALUES ($1, $2, 'tenant_export_completed', 'tenant_export_jobs', $3, $4::jsonb)`,
        [orgId, claimed.requested_by, claimed.id, JSON.stringify({ fileSizeBytes: archiveBuffer.length, sha256 })]
      );
    });
    return 1;
  } catch (err) {
    await withTenant(orgId, async (client) => {
      await client.query(
        `UPDATE tenant_export_jobs SET status = CASE WHEN attempt_count >= max_attempts THEN 'failed' ELSE 'queued' END, last_error = $1 WHERE id = $2`,
        [err.message || 'Export failed', claimed.id]
      );
    });
    throw err;
  }
}

async function runOnce() {
  const orgs = await pool.query('SELECT id FROM organizations');
  let processed = 0;
  let released = 0;
  let expired = 0;
  const { client: s3, bucket } = getS3();

  for (const row of orgs.rows) {
    processed += await processOrgJobs(row.id);
    const cleanup = await withTenant(row.id, async (client) => {
      const d = await client.query(
        `UPDATE documents SET document_status = 'rejected', reserved_bytes = 0 WHERE organization_id = $1 AND document_status = 'pending_upload' AND upload_expires_at < CURRENT_TIMESTAMP RETURNING s3_key`,
        [row.id]
      );
      const j = await client.query(
        `UPDATE tenant_export_jobs SET status = 'expired', current_step = 'Expired by retention policy' WHERE organization_id = $1 AND status = 'completed' AND expires_at < CURRENT_TIMESTAMP RETURNING s3_key`,
        [row.id]
      );
      return { docs: d.rows, jobs: j.rows };
    });
    for (const d of cleanup.docs) {
      released++;
      if (d.s3_key) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: d.s3_key })).catch(() => {});
    }
    for (const j of cleanup.jobs) {
      expired++;
      if (j.s3_key) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: j.s3_key })).catch(() => {});
    }
  }

  console.log(`[ExportWorker] processedExports=${processed}, releasedPendingUploads=${released}, expiredExports=${expired}`);
}

async function main() {
  await runOnce();
  if (process.argv.includes('--watch')) {
    setInterval(() => runOnce().catch((e) => console.error('[ExportWorker] error:', e)), 10000);
  } else {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[ExportWorker] fatal:', err);
  process.exit(1);
});
