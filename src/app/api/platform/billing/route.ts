import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/rbac';
import { withPlatformContext } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const authz = await requirePlatformOwner(req);
    if (!authz.authorized) return authz.errorResponse;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const data = await withPlatformContext(authz.session, async (client) => {
      const [paymentsRes, invoicesRes, webhooksRes, auditRes, settingsRes, metricsRes] = await Promise.all([
        client.query(
          `
          SELECT sp.*, si.invoice_number, o.name AS organization_name
          FROM subscription_payments sp
          LEFT JOIN subscription_invoices si ON sp.invoice_id = si.id
          LEFT JOIN organizations o ON COALESCE(sp.organization_id, si.organization_id) = o.id
          ORDER BY sp.created_at DESC
          LIMIT $1 OFFSET $2
          `,
          [limit, offset]
        ),
        client.query(
          `
          SELECT si.*, o.name AS organization_name
          FROM subscription_invoices si
          JOIN organizations o ON si.organization_id = o.id
          ORDER BY si.created_at DESC
          LIMIT $1 OFFSET $2
          `,
          [limit, offset]
        ),
        client.query(
          `
          SELECT id, event_id, event_type, gateway, status, error_message, processed_at, created_at
          FROM payment_webhook_events
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2
          `,
          [limit, offset]
        ),
        client.query(
          `
          SELECT pal.*, po.email AS actor_email
          FROM platform_audit_logs pal
          LEFT JOIN users po ON pal.actor_user_id = po.id
          ORDER BY pal.created_at DESC
          LIMIT $1 OFFSET $2
          `,
          [limit, offset]
        ),
        client.query('SELECT * FROM platform_billing_settings LIMIT 1'),
        client.query(`
          SELECT
            (SELECT COALESCE(SUM(amount), 0) FROM subscription_payments WHERE status = 'succeeded') AS total_revenue_inr,
            (SELECT count(*) FROM tenant_subscriptions WHERE status = 'active') AS active_subscriptions,
            (SELECT count(*) FROM tenant_subscriptions WHERE status = 'trial') AS trial_subscriptions,
            (SELECT count(*) FROM tenant_subscriptions WHERE status IN ('grace_period', 'past_due')) AS delinquent_subscriptions,
            (SELECT count(*) FROM tenant_subscriptions WHERE status = 'suspended') AS suspended_subscriptions,
            (SELECT count(*) FROM subscription_invoices WHERE status = 'open') AS open_invoices
        `),
      ]);

      // Aggregate non-clinical tenant usage metrics (no medical data)
      const usageRes = await client.query(`
        SELECT
          o.id AS organization_id,
          o.name AS organization_name,
          sp.name AS plan_name,
          ts.status AS subscription_status,
          sp.resident_limit,
          sp.staff_limit,
          sp.branch_limit,
          sp.storage_limit_mb,
          (SELECT count(*)::int FROM residents r WHERE r.organization_id = o.id AND r.is_deleted = false AND r.resident_status IN ('active', 'hospitalized', 'temporary_leave')) AS active_residents,
          (SELECT count(*)::int FROM organization_memberships m WHERE m.organization_id = o.id AND m.status = 'active') AS active_staff,
          (SELECT count(*)::int FROM branches b WHERE b.organization_id = o.id AND b.status = 'active') AS active_branches,
          COALESCE((SELECT SUM(d.file_size_bytes)::bigint FROM documents d WHERE d.organization_id = o.id), 0) AS storage_bytes
        FROM organizations o
        LEFT JOIN tenant_subscriptions ts ON ts.organization_id = o.id
        LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
        ORDER BY o.name ASC
      `);

      return {
        payments: paymentsRes.rows,
        invoices: invoicesRes.rows,
        webhooks: webhooksRes.rows,
        auditLogs: auditRes.rows,
        settings: settingsRes.rows[0] || null,
        metrics: metricsRes.rows[0] || {},
        tenantUsage: usageRes.rows,
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET /api/platform/billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authz = await requirePlatformOwner(req);
    if (!authz.authorized) return authz.errorResponse;

    const body = await req.json();
    const {
      defaultTrialDays,
      gracePeriodDays,
      pastDueToleranceDays,
      razorpayMode,
      gstPercentage,
      invoicePrefix,
      supportBillingEmail,
    } = body;

    const updated = await withPlatformContext(authz.session, async (client) => {
      const existing = await client.query('SELECT id FROM platform_billing_settings LIMIT 1');
      if (existing.rows.length === 0) {
        const ins = await client.query(
          `
          INSERT INTO platform_billing_settings (
            default_trial_days, grace_period_days, past_due_tolerance_days,
            razorpay_mode, gst_percentage, invoice_prefix, support_billing_email
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;
          `,
          [
            defaultTrialDays ?? 14,
            gracePeriodDays ?? 7,
            pastDueToleranceDays ?? 14,
            razorpayMode === 'live' ? 'test' : razorpayMode || 'test',
            gstPercentage ?? 0,
            invoicePrefix || 'INV',
            supportBillingEmail || 'billing@eldercareos.com',
          ]
        );
        return ins.rows[0];
      }

      const res = await client.query(
        `
        UPDATE platform_billing_settings
        SET default_trial_days = COALESCE($1, default_trial_days),
            grace_period_days = COALESCE($2, grace_period_days),
            past_due_tolerance_days = COALESCE($3, past_due_tolerance_days),
            razorpay_mode = 'test',
            gst_percentage = COALESCE($4, gst_percentage),
            invoice_prefix = COALESCE($5, invoice_prefix),
            support_billing_email = COALESCE($6, support_billing_email),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *;
        `,
        [
          defaultTrialDays ?? null,
          gracePeriodDays ?? null,
          pastDueToleranceDays ?? null,
          gstPercentage ?? null,
          invoicePrefix ?? null,
          supportBillingEmail ?? null,
          existing.rows[0].id,
        ]
      );

      await client.query(
        `
        INSERT INTO platform_audit_logs (actor_user_id, action, resource_type, resource_id, details)
        VALUES ($1, 'billing_settings_updated', 'platform_billing_settings', $2, $3::jsonb)
        `,
        [authz.session.userId, res.rows[0].id, JSON.stringify({ defaultTrialDays, gracePeriodDays })]
      );

      return res.rows[0];
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('PATCH /api/platform/billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
