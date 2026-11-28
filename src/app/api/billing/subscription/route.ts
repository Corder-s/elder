import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { listSubscriptionPlans, getPlanByIdOrSlug } from '@/lib/billing/plans';
import { getOrganizationUsageSnapshot } from '@/lib/billing/quota-service';
import { evaluateHealthcareSafetyPolicy, type LifecycleStatus } from '@/lib/billing/entitlements';
import { transitionSubscriptionLifecycle } from '@/lib/billing/subscription-service';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:subscription:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;

    const subscription = await withTenantContext(orgId, async (client) => {
      const subRes = await client.query(
        `
        SELECT ts.*, sp.name AS plan_name, sp.slug AS plan_slug,
               sp.price_monthly_inr, sp.price_annual_inr,
               sp.resident_limit, sp.staff_limit, sp.branch_limit, sp.storage_limit_mb,
               sp.features AS plan_features
        FROM tenant_subscriptions ts
        JOIN subscription_plans sp ON ts.plan_id = sp.id
        WHERE ts.organization_id = $1
        `,
        [orgId]
      );
      return subRes.rows[0] || null;
    });
    const status = (subscription?.status || 'trial') as LifecycleStatus;
    const [plans, usage] = await Promise.all([
      listSubscriptionPlans(false),
      getOrganizationUsageSnapshot(orgId),
    ]);

    const safetyPolicy = evaluateHealthcareSafetyPolicy(status);

    return NextResponse.json({
      subscription,
      plans,
      usage,
      safetyPolicy,
    });
  } catch (error: any) {
    console.error('GET /api/billing/subscription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:subscription:manage');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;

    const body = await req.json();
    const { action, targetPlanId, reason } = body;

    if (!['downgrade', 'cancel', 'reactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid subscription action. Allowed: downgrade, cancel, reactivate' },
        { status: 400 }
      );
    }

    if (action === 'downgrade') {
      if (!targetPlanId) {
        return NextResponse.json({ error: 'targetPlanId is required for downgrade' }, { status: 400 });
      }
      const targetPlan = await getPlanByIdOrSlug(targetPlanId);
      if (!targetPlan || !targetPlan.isActive) {
        return NextResponse.json({ error: 'Target subscription plan is not available' }, { status: 404 });
      }
      const usage = await getOrganizationUsageSnapshot(orgId);
      if (
        usage.residents.currentCount > targetPlan.residentLimit ||
        usage.staff.currentCount > targetPlan.staffLimit ||
        usage.branches.currentCount > targetPlan.branchLimit
      ) {
        return NextResponse.json(
          {
            error: `Cannot downgrade to ${targetPlan.name}: current usage (${usage.residents.currentCount} residents, ${usage.staff.currentCount} staff, ${usage.branches.currentCount} branches) exceeds plan limits (${targetPlan.residentLimit} residents, ${targetPlan.staffLimit} staff, ${targetPlan.branchLimit} branches).`,
          },
          { status: 409 }
        );
      }
    }

    const result = await transitionSubscriptionLifecycle({
      organizationId: orgId,
      actorUserId: session.userId,
      action,
      targetPlanId,
      reason,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('POST /api/billing/subscription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
