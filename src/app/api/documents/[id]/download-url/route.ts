import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission, isFamilyRole, getFamilyResidentLinks } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';
import { canUserAccessDocument } from '@/lib/storage/document-auth';
import { generatePresignedDownloadUrl } from '@/lib/storage/s3-client';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, ['document:read', 'family:resident:view_own']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;
    const { id } = await context.params;
    const { ipAddress } = getClientMetadata(req);

    let linkedIds: string[] | null = null;
    if (isFamilyRole(session.roleSlug)) {
      const links = await getFamilyResidentLinks(orgId, session.userId);
      linkedIds = links.map((l) => l.residentId);
    }

    const docResult = await withTenantContext(orgId, async (client) => {
      const res = await client.query('SELECT * FROM documents WHERE id = $1', [id]);
      const doc = res.rows[0] || null;
      const access = canUserAccessDocument({ session, doc, linkedResidentIds: linkedIds });

      if (!access.allowed) {
        await logTenantAudit(client, {
          organizationId: orgId,
          actorId: session.userId,
          action: 'document_download_denied',
          entityName: 'documents',
          entityId: id,
          newData: { reason: access.reason, status: access.status },
          ipAddress,
        });
        return { status: access.status, error: access.reason };
      }

      if (doc.document_status !== 'available') {
        return {
          status: 409,
          error: `Document is not available for download (status: ${doc.document_status})`,
        };
      }

      await logTenantAudit(client, {
        organizationId: orgId,
        actorId: session.userId,
        action: 'document_download_authorized',
        entityName: 'documents',
        entityId: id,
        newData: { fileName: doc.file_name },
        ipAddress,
      });

      return { status: 200, doc };
    });

    if (docResult.status !== 200 || !docResult.doc) {
      return NextResponse.json({ error: docResult.error }, { status: docResult.status });
    }

    const doc = docResult.doc;
    const presigned = await generatePresignedDownloadUrl({
      key: doc.s3_key,
      fileName: doc.file_name,
      contentType: doc.mime_type,
      expiresInSeconds: 180,
    });

    return NextResponse.json({
      downloadUrl: presigned.url,
      expiresInSeconds: presigned.expiresInSeconds,
      fileName: doc.file_name,
      mimeType: doc.mime_type,
      sha256Checksum: doc.sha256_checksum || null,
    });
  } catch (error: any) {
    console.error('GET /api/documents/[id]/download-url error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate download URL' }, { status: 500 });
  }
}
