import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'document:extraction:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const { id } = await context.params;

    const job = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        `
        SELECT j.*, d.title AS document_title, d.file_name, d.mime_type, d.is_confidential, d.branch_id
        FROM document_processing_jobs j
        JOIN documents d ON j.document_id = d.id
        WHERE j.id = $1 AND j.organization_id = $2
        `,
        [id, session.activeOrgId]
      );
      return res.rows[0] || null;
    });

    if (!job) {
      return NextResponse.json({ error: 'Processing job not found' }, { status: 404 });
    }
    if (session.branchId && session.roleSlug !== 'admin' && job.branch_id && job.branch_id !== session.branchId) {
      return NextResponse.json({ error: 'Forbidden: Job belongs to another branch' }, { status: 403 });
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
