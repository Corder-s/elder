import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission, isFamilyRole, getFamilyResidentLinks } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';
import { canUserAccessDocument, sanitizeDocumentRecord } from '@/lib/storage/document-auth';

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

    let linkedIds: string[] | null = null;
    if (isFamilyRole(session.roleSlug)) {
      const links = await getFamilyResidentLinks(orgId, session.userId);
      linkedIds = links.map((l) => l.residentId);
    }

    const result = await withTenantContext(orgId, async (client) => {
      const res = await client.query(
        `
        SELECT d.*, r.full_name AS resident_name, u.full_name AS uploader_name
        FROM documents d
        LEFT JOIN residents r ON d.resident_id = r.id
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE d.id = $1
        `,
        [id]
      );
      const doc = res.rows[0] || null;
      const access = canUserAccessDocument({ session, doc, linkedResidentIds: linkedIds });
      if (!access.allowed) {
        return { status: access.status, error: access.reason };
      }
      return { status: 200, doc };
    });

    if (result.status !== 200 || !result.doc) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ document: sanitizeDocumentRecord(result.doc) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, ['document:archive', 'document:delete']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;
    const { id } = await context.params;
    const { ipAddress } = getClientMetadata(req);

    const body = await req.json();
    const { action, reason } = body;
    if (action !== 'archive' && action !== 'restore') {
      return NextResponse.json({ error: 'action must be archive or restore' }, { status: 400 });
    }

    const result = await withTenantContext(orgId, async (client) => {
      const existing = await client.query('SELECT * FROM documents WHERE id = $1 FOR UPDATE', [id]);
      if (existing.rows.length === 0 || existing.rows[0].is_deleted) {
        return { status: 404, error: 'Document not found' };
      }
      const doc = existing.rows[0];
      if (
        session.branchId &&
        session.roleSlug !== 'admin' &&
        doc.branch_id &&
        doc.branch_id !== session.branchId
      ) {
        return { status: 403, error: 'Forbidden: Document belongs to another branch' };
      }

      const upd =
        action === 'archive'
          ? await client.query(
              `
              UPDATE documents
              SET document_status = 'archived',
                  archived_at = CURRENT_TIMESTAMP,
                  archived_by = $1,
                  archive_reason = $2
              WHERE id = $3
              RETURNING *;
              `,
              [session.userId, reason || 'Archived by administrator', id]
            )
          : await client.query(
              `
              UPDATE documents
              SET document_status = 'available',
                  archived_at = NULL,
                  archived_by = NULL,
                  archive_reason = NULL
              WHERE id = $1
              RETURNING *;
              `,
              [id]
            );

      await logTenantAudit(client, {
        organizationId: orgId,
        actorId: session.userId,
        action: action === 'archive' ? 'document_archived' : 'document_restored',
        entityName: 'documents',
        entityId: id,
        newData: { reason: reason || null },
        ipAddress,
      });

      return { status: 200, doc: upd.rows[0] };
    });

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, document: sanitizeDocumentRecord(result.doc) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
