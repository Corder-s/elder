/**
 * ElderCare OS — Retention & Cleanup Service
 * Releases expired pending upload reservations and expires old export archives.
 */

import { getDbPool, withTenantContext } from '@/lib/db';
import { logTenantAudit } from '@/lib/audit';
import { deleteStorageObject } from '@/lib/storage/s3-client';

export async function runRetentionCleanupForOrg(organizationId: string): Promise<{
  releasedPendingUploads: number;
  expiredExports: number;
}> {
  let releasedPendingUploads = 0;
  let expiredExports = 0;

  const { abandonedDocs, expiredJobs } = await withTenantContext(organizationId, async (client) => {
    const docsRes = await client.query(
      `
      UPDATE documents
      SET document_status = 'rejected',
          reserved_bytes = 0
      WHERE organization_id = $1
        AND document_status = 'pending_upload'
        AND upload_expires_at IS NOT NULL
        AND upload_expires_at < CURRENT_TIMESTAMP
      RETURNING id, s3_key;
      `,
      [organizationId]
    );

    const jobsRes = await client.query(
      `
      UPDATE tenant_export_jobs
      SET status = 'expired',
          current_step = 'Expired by retention policy'
      WHERE organization_id = $1
        AND status = 'completed'
        AND expires_at IS NOT NULL
        AND expires_at < CURRENT_TIMESTAMP
      RETURNING id, s3_key, requested_by;
      `,
      [organizationId]
    );

    for (const job of jobsRes.rows) {
      await logTenantAudit(client, {
        organizationId,
        actorId: job.requested_by,
        action: 'tenant_export_expired',
        entityName: 'tenant_export_jobs',
        entityId: job.id,
      });
    }

    return { abandonedDocs: docsRes.rows, expiredJobs: jobsRes.rows };
  });

  for (const doc of abandonedDocs) {
    releasedPendingUploads++;
    if (doc.s3_key) {
      await deleteStorageObject(doc.s3_key).catch(() => {});
    }
  }

  for (const job of expiredJobs) {
    expiredExports++;
    if (job.s3_key) {
      await deleteStorageObject(job.s3_key).catch(() => {});
    }
  }

  return { releasedPendingUploads, expiredExports };
}

export async function runGlobalRetentionCleanup() {
  const pool = getDbPool();
  const orgs = await pool.query('SELECT id FROM organizations');
  let totalReleased = 0;
  let totalExpired = 0;

  for (const org of orgs.rows) {
    const res = await runRetentionCleanupForOrg(org.id);
    totalReleased += res.releasedPendingUploads;
    totalExpired += res.expiredExports;
  }

  return { totalReleased, totalExpired };
}
