import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/rbac';
import { verifyAndSettleCheckoutPayment } from '@/lib/billing/subscription-service';

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:subscription:manage');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const body = await req.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, targetPlanId, billingInterval } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'razorpayOrderId, razorpayPaymentId, and razorpaySignature are required' },
        { status: 400 }
      );
    }

    const result = await verifyAndSettleCheckoutPayment({
      organizationId: session.activeOrgId!,
      actorUserId: session.userId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      targetPlanId,
      billingInterval,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    const msg = error?.message || 'Payment verification failed';
    const status = msg.toLowerCase().includes('signature') ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
