import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/rbac';
import { initiateCheckoutOrder } from '@/lib/billing/subscription-service';

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:subscription:manage');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const body = await req.json();
    const { targetPlanSlugOrId, billingInterval = 'monthly' } = body;

    if (!targetPlanSlugOrId) {
      return NextResponse.json({ error: 'targetPlanSlugOrId is required' }, { status: 400 });
    }
    if (billingInterval !== 'monthly' && billingInterval !== 'annual') {
      return NextResponse.json({ error: 'billingInterval must be monthly or annual' }, { status: 400 });
    }

    const checkout = await initiateCheckoutOrder({
      organizationId: session.activeOrgId!,
      actorUserId: session.userId,
      targetPlanSlugOrId,
      billingInterval,
    });

    return NextResponse.json({ success: true, ...checkout }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/billing/checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
