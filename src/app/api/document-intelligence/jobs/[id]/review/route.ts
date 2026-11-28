import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/rbac';
import { getClientMetadata } from '@/lib/security';
import { recordExtractionReview } from '@/lib/document-intelligence/review-service';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'document:review');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const { id } = await context.params;
    const body = await req.json();
    const { ipAddress } = getClientMetadata(req);

    const res = await recordExtractionReview({
      organizationId: session.activeOrgId!,
      jobId: id,
      reviewerId: session.userId,
      editedFields: body.editedFields,
      verifiedFieldKeys: body.verifiedFieldKeys,
      reviewNotes: body.reviewNotes,
      ipAddress,
    });

    if (res.status !== 200) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }

    return NextResponse.json({
      success: true,
      extractedFields: res.extractedFields,
      reviewRecord: res.reviewRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
