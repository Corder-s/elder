import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { AI_SAFETY_NOTICE } from '@/lib/document-intelligence/types';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'document:extraction:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;
    const { id } = await context.params;

    const data = await withTenantContext(orgId, async (client) => {
      const jobRes = await client.query(
        `
        SELECT j.*, d.title AS document_title, d.file_name, d.mime_type, d.is_confidential, d.branch_id
        FROM document_processing_jobs j
        JOIN documents d ON j.document_id = d.id
        WHERE j.id = $1 AND j.organization_id = $2
        `,
        [id, orgId]
      );
      if (jobRes.rows.length === 0) return { status: 404, error: 'Processing job not found' };
      const job = jobRes.rows[0];

      if (session.branchId && session.roleSlug !== 'admin' && job.branch_id && job.branch_id !== session.branchId) {
        return { status: 403, error: 'Forbidden: Document belongs to another branch' };
      }

      const canViewConfidential = ['admin', 'doctor', 'accountant'].includes(session.roleSlug || '');
      if (job.is_confidential && !canViewConfidential) {
        return { status: 403, error: 'Forbidden: Confidential document extraction restricted' };
      }

      const [extRes, revRes] = await Promise.all([
        client.query('SELECT * FROM document_extraction_results WHERE job_id = $1', [id]),
        client.query(
          `
          SELECT r.*, u.full_name AS reviewer_name
          FROM document_review_records r
          LEFT JOIN users u ON r.reviewer_id = u.id
          WHERE r.job_id = $1
          ORDER BY r.created_at DESC
          `,
          [id]
        ),
      ]);

      return {
        status: 200,
        job,
        extraction: extRes.rows[0] || null,
        reviews: revRes.rows,
      };
    });

    if (data.status !== 200) {
      return NextResponse.json({ error: data.error }, { status: data.status });
    }

    return NextResponse.json({
      safetyNotice: AI_SAFETY_NOTICE,
      job: data.job,
      extraction: data.extraction,
      reviews: data.reviews,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
