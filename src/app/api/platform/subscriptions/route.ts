import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/rbac';
import { withPlatformContext } from '@/lib/db';
import { transitionSubscriptionLifecycle } from '@/lib/billing/subscription-service';
import { generateInvoiceTx } from '@/lib/billing/invoice-service';

export async function GET(req: NextRequest) {
  try {
    const authz = await requirePlatformOwner(req);
    if (!authz.authorized) return authz.errorResponse;

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const planFilter = searchParams.get('plan');

    const subscriptions = await withPlatformContext(authz.session, async (client) => {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (statusFilter) {
        params.push(statusFilter);
        conditions.push(`ts.status = $${params.length}`);
      }
      if (planFilter) {
        params.push(planFilter);
        conditions.push(`sp.slug = $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const res = await client.query(
        `
        SELECT ts.*, o.name AS organization_name, o.slug AS organization_slug, o.primary_email,
               sp.name AS plan_name, sp.slug AS plan_slug,
               sp.price_monthly_inr, sp.resident_limit, sp.staff_limit, sp.branch_limit, sp.storage_limit_mb
        FROM tenant_subscriptions ts
        JOIN organizations o ON ts.organization_id = o.id
        JOIN subscription_plans sp ON ts.plan_id = sp.id
        ${whereClause}
        ORDER BY ts.updated_at DESC
        `,
        params
      );
      return res.rows;
    });

    return NextResponse.json({ subscriptions });
  } catch (error: any) {
    console.error('GET /api/platform/subscriptions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authz = await requirePlatformOwner(req);
    if (!authz.authorized) return authz.errorResponse;

    const body = await req.json();
    const { organizationId, action, reason, targetPlanId, creditAmountInr, relatedInvoiceId } = body;

    if (!organizationId || !action) {
      return NextResponse.json({ error: 'organizationId and action are required' }, { status: 400 });
    }

    if (action === 'issue_credit_note') {
      const amount = Number(creditAmountInr || 0);
      if (amount <= 0) {
        return NextResponse.json({ error: 'creditAmountInr must be positive' }, { status: 400 });
      }
      const creditNote = await withPlatformContext(authz.session, async (client) => {
        const subRes = await client.query(
          'SELECT id FROM tenant_subscriptions WHERE organization_id = $1',
          [organizationId]
        );
        if (subRes.rows.length === 0) throw new Error('Subscription not found');
        const now = new Date();
        const cn = await generateInvoiceTx(client, {
          organizationId,
          subscriptionId: subRes.rows[0].id,
          subtotalInr: -Math.abs(amount),
          taxAmountInr: 0,
          periodStart: now,
          periodEnd: now,
          dueDate: now,
          invoiceType: 'credit_note',
          relatedInvoiceId: relatedInvoiceId || null,
          notes: reason || 'Platform Owner credit note adjustment',
        });

        await client.query(
          `
          INSERT INTO platform_audit_logs (actor_user_id, action, resource_type, resource_id, details)
          VALUES ($1, 'credit_note_issued', 'subscription_invoice', $2, $3::jsonb)
          `,
          [authz.session.userId, cn.id, JSON.stringify({ organizationId, amount, reason })]
        );
        return cn;
      });
      return NextResponse.json({ success: true, creditNote });
    }

    const allowedActions = [
      'suspend',
      'reactivate',
      'enter_grace_period',
      'mark_past_due',
      'expire_trial',
      'expire',
      'cancel',
      'downgrade',
    ];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }

    const result = await transitionSubscriptionLifecycle({
      organizationId,
      actorUserId: authz.session.userId,
      action,
      targetPlanId,
      reason: reason || `Platform Owner action: ${action}`,
    });

    await withPlatformContext(authz.session, async (client) => {
      await client.query(
        `
        INSERT INTO platform_audit_logs (actor_user_id, action, resource_type, resource_id, details)
        VALUES ($1, $2, 'tenant_subscription', $3, $4::jsonb)
        `,
        [
          authz.session.userId,
          `platform_subscription_${action}`,
          result.subscriptionId,
          JSON.stringify({ organizationId, reason }),
        ]
      );
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('PATCH /api/platform/subscriptions error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
