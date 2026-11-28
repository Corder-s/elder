import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'document:extraction:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const jobs = await withTenantContext(orgId, async (client) => {
      const params: any[] = [orgId];
      let where = 'WHERE j.organization_id = $1';
      if (status && status !== 'all') {
        params.push(status);
        where += ` AND j.status = $${params.length}`;
      }
      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        where += ` AND (d.branch_id IS NULL OR d.branch_id = $${params.length})`;
      }

      const res = await client.query(
        `
        SELECT j.*, d.title AS document_title, d.file_name, d.mime_type, d.is_confidential,
               r.predicted_category, r.classification_confidence, r.requires_manual_review, r.prompt_injection_detected
        FROM document_processing_jobs j
        JOIN documents d ON j.document_id = d.id
        LEFT JOIN document_extraction_results r ON r.job_id = j.id
        ${where}
        ORDER BY j.created_at DESC
        LIMIT 50;
        `,
        params
      );
      return res.rows;
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
