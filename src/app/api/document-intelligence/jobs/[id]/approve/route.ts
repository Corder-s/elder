import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/rbac';
import { getClientMetadata } from '@/lib/security';
import { approveOrRejectExtraction } from '@/lib/document-intelligence/review-service';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'document:approve');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { ipAddress } = getClientMetadata(req);

    const res = await approveOrRejectExtraction({
      organizationId: session.activeOrgId!,
      jobId: id,
      reviewerId: session.userId,
      roleSlug: session.roleSlug || '',
      decision: 'approve',
      reviewNotes: body.reviewNotes,
      ipAddress,
    });

    if (res.status !== 200) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }

    return NextResponse.json({ success: true, job: res.job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
