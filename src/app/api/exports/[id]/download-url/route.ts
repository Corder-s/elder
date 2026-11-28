import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';
import { generatePresignedDownloadUrl } from '@/lib/storage/s3-client';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'org:data:export');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;
    const { id } = await context.params;
    const { ipAddress } = getClientMetadata(req);

    const job = await withTenantContext(orgId, async (client) => {
      const res = await client.query(
        'SELECT * FROM tenant_export_jobs WHERE id = $1 AND organization_id = $2',
        [id, orgId]
      );
      if (res.rows.length === 0) return { status: 404, error: 'Export job not found' };
      const row = res.rows[0];

      if (row.status === 'expired' || (row.expires_at && new Date(row.expires_at) < new Date())) {
        return { status: 410, error: 'Export archive has expired' };
      }
      if (row.status !== 'completed' || !row.s3_key) {
        return { status: 409, error: `Export is not ready (status: ${row.status})` };
      }

      await logTenantAudit(client, {
        organizationId: orgId,
        actorId: session.userId,
        action: 'tenant_export_downloaded',
        entityName: 'tenant_export_jobs',
        entityId: id,
        ipAddress,
      });

      return { status: 200, row };
    });

    if (job.status !== 200 || !job.row) {
      return NextResponse.json({ error: job.error }, { status: job.status });
    }

    const row = job.row;
    const ext = row.export_format === 'json' ? 'json' : 'zip';
    const contentType = row.export_format === 'json' ? 'application/json' : 'application/zip';
    const presigned = await generatePresignedDownloadUrl({
      key: row.s3_key,
      fileName: `eldercare-export-${row.id}.${ext}`,
      contentType,
      expiresInSeconds: 180,
    });

    return NextResponse.json({
      downloadUrl: presigned.url,
      expiresInSeconds: presigned.expiresInSeconds,
      sha256Checksum: row.sha256_checksum,
      fileSizeBytes: Number(row.file_size_bytes || 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
