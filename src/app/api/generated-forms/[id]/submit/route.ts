import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/rbac';
import { getClientMetadata } from '@/lib/security';
import { submitFormDraftToOperations } from '@/lib/document-intelligence/form-generator';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'form:submit');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const { id } = await context.params;
    const { ipAddress } = getClientMetadata(req);

    const result = await submitFormDraftToOperations({
      organizationId: session.activeOrgId!,
      draftId: id,
      actorUserId: session.userId,
      roleSlug: session.roleSlug || '',
      branchId: session.branchId,
      ipAddress,
    });

    if (result.status !== 200) {
      return NextResponse.json(
        { error: result.error, validationErrors: result.validationErrors },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      form: result.draft,
      targetEntityType: result.targetEntityType,
      targetEntityId: result.targetEntityId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
