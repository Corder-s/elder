import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/rbac';
import {
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  getPlanUsageAcrossTenants,
} from '@/lib/billing/plans';

export async function GET(req: NextRequest) {
  try {
    const authz = await requirePlatformOwner(req);
    if (!authz.authorized) return authz.errorResponse;

    const [plans, usageRows] = await Promise.all([
      listSubscriptionPlans(true),
      getPlanUsageAcrossTenants(authz.session),
    ]);

    const usageMap = new Map<string, number>();
    for (const row of usageRows) {
      usageMap.set(row.id, parseInt(row.total_subscribers || '0', 10));
    }

    return NextResponse.json({
      plans: plans.map((p) => ({
        ...p,
        activeTenants: usageMap.get(p.id) || 0,
      })),
    });
  } catch (error: any) {
    console.error('GET /api/platform/plans error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requirePlatformOwner(req);
    if (!authz.authorized) return authz.errorResponse;

    const body = await req.json();
    const {
      name,
      slug,
      description,
      priceMonthlyInr,
      priceAnnualInr,
      residentLimit,
      staffLimit,
      branchLimit,
      storageLimitMb,
      features,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    const plan = await createSubscriptionPlan(authz.session, {
      name,
      slug,
      description,
      priceMonthlyInr: Number(priceMonthlyInr ?? 0),
      priceAnnualInr: Number(priceAnnualInr ?? 0),
      residentLimit: Number(residentLimit ?? 10),
      staffLimit: Number(staffLimit ?? 5),
      branchLimit: Number(branchLimit ?? 1),
      storageLimitMb: Number(storageLimitMb ?? 1024),
      features: features || {},
    });

    return NextResponse.json({ success: true, plan }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/platform/plans error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authz = await requirePlatformOwner(req);
    if (!authz.authorized) return authz.errorResponse;

    const body = await req.json();
    const { planId, ...updates } = body;

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const updated = await updateSubscriptionPlan(authz.session, planId, updates);
    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    console.error('PATCH /api/platform/plans error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
