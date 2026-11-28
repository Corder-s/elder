/**
 * ElderCare OS — Complete Subscription Lifecycle Service
 * Handles trials, upgrades, downgrades, renewals, payment verification,
 * grace periods, past-due, suspensions, cancellations, reactivations, and billing notifications.
 */

import type { PoolClient } from 'pg';
import { withTenantContext, getDbPool } from '@/lib/db';
import { logTenantAudit } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { getPlanByIdOrSlug } from './plans';
import { createRazorpayTestOrder, verifyRazorpayCheckoutSignature } from './payment-provider';
import { generateInvoiceTx } from './invoice-service';

export async function recordBillingNotification(
  client: PoolClient,
  params: {
    organizationId: string;
    notificationType: string;
    subject: string;
    summary: string;
  }
) {
  const orgRes = await client.query('SELECT primary_email, name FROM organizations WHERE id = $1', [
    params.organizationId,
  ]);
  const email = orgRes.rows[0]?.primary_email || 'admin@eldercareos.com';
  const orgName = orgRes.rows[0]?.name || 'NGO Workspace';

  await client.query(
    `
    INSERT INTO billing_notifications (organization_id, notification_type, recipient_email, subject, summary, status)
    VALUES ($1, $2, $3, $4, $5, 'sent')
    `,
    [params.organizationId, params.notificationType, email, params.subject, params.summary]
  );

  // Best-effort email dispatch through existing email provider (never exposes clinical info)
  sendEmail({
    to: email,
    subject: `[ElderCare OS] ${params.subject}`,
    text: `Hello ${orgName},\n\n${params.summary}\n\nManage your subscription in Workspace Settings -> Billing.`,
    html: `<p>Hello ${orgName},</p><p>${params.summary}</p>`,
  }).catch(() => {});
}

export async function initiateCheckoutOrder(params: {
  organizationId: string;
  actorUserId: string;
  targetPlanSlugOrId: string;
  billingInterval: 'monthly' | 'annual';
}) {
  const plan = await getPlanByIdOrSlug(params.targetPlanSlugOrId);
  if (!plan || !plan.isActive) {
    throw new Error('Selected subscription plan is not available');
  }

  const amountInr =
    params.billingInterval === 'annual' ? plan.priceAnnualInr : plan.priceMonthlyInr;

  return withTenantContext(params.organizationId, async (client) => {
    const subRes = await client.query(
      'SELECT * FROM tenant_subscriptions WHERE organization_id = $1 FOR UPDATE',
      [params.organizationId]
    );
    if (subRes.rows.length === 0) {
      throw new Error('Subscription record not found for organization');
    }
    const sub = subRes.rows[0];

    const periodStart = new Date();
    const periodEnd = new Date(
      periodStart.getTime() + (params.billingInterval === 'annual' ? 365 : 30) * 86400000
    );
    const dueDate = new Date(periodStart.getTime() + 7 * 86400000);

    const invoice = await generateInvoiceTx(client, {
      organizationId: params.organizationId,
      subscriptionId: sub.id,
      subtotalInr: amountInr,
      taxAmountInr: 0,
      currency: 'INR',
      periodStart,
      periodEnd,
      dueDate,
      notes: `Plan checkout: ${plan.name} (${params.billingInterval})`,
    });

    const order = await createRazorpayTestOrder({
      amountInInr: amountInr,
      currency: 'INR',
      receipt: invoice.invoice_number,
      notes: {
        organizationId: params.organizationId,
        invoiceId: invoice.id,
        targetPlanId: plan.id,
        billingInterval: params.billingInterval,
      },
    });

    const payRes = await client.query(
      `
      INSERT INTO subscription_payments (
        organization_id, invoice_id, amount, currency, status, payment_method, razorpay_order_id
      ) VALUES ($1, $2, $3, 'INR', 'pending', 'razorpay', $4)
      RETURNING *;
      `,
      [params.organizationId, invoice.id, amountInr, order.orderId]
    );

    // Move trial/cancelled/expired/past_due into pending_payment only if not currently active
    if (sub.status !== 'active') {
      await client.query(
        `UPDATE tenant_subscriptions SET status = 'pending_payment' WHERE id = $1`,
        [sub.id]
      );
    }

    await logTenantAudit(client, {
      organizationId: params.organizationId,
      actorId: params.actorUserId,
      action: 'checkout_order_created',
      entityName: 'subscription_invoices',
      entityId: invoice.id,
      newData: { orderId: order.orderId, planSlug: plan.slug, amountInr },
    });

    return {
      invoice,
      payment: payRes.rows[0],
      razorpayOrder: order,
      targetPlan: plan,
    };
  });
}

export async function verifyAndSettleCheckoutPayment(params: {
  organizationId: string;
  actorUserId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  targetPlanId?: string;
  billingInterval?: 'monthly' | 'annual';
}) {
  // 1. Server-side cryptographic signature verification (never trust browser success claim)
  const validSig = verifyRazorpayCheckoutSignature({
    orderId: params.razorpayOrderId,
    paymentId: params.razorpayPaymentId,
    signature: params.razorpaySignature,
  });

  if (!validSig) {
    throw new Error('Invalid payment signature. Verification rejected.');
  }

  return withTenantContext(params.organizationId, async (client) => {
    // 2. Lock payment row & verify organization association
    const payRes = await client.query(
      `
      SELECT sp.*, si.organization_id AS inv_org_id, si.subscription_id, si.total, si.currency,
             si.period_start, si.period_end, si.status AS inv_status
      FROM subscription_payments sp
      JOIN subscription_invoices si ON sp.invoice_id = si.id
      WHERE sp.razorpay_order_id = $1 AND si.organization_id = $2
      FOR UPDATE OF sp, si
      `,
      [params.razorpayOrderId, params.organizationId]
    );

    if (payRes.rows.length === 0) {
      throw new Error('Payment order not found for this organization');
    }

    const payment = payRes.rows[0];
    if (payment.status === 'succeeded' || payment.inv_status === 'paid') {
      // Idempotent duplicate settlement prevention
      return { alreadySettled: true, invoiceId: payment.invoice_id };
    }

    // Prevent duplicate payment ID reuse
    const dupPid = await client.query(
      'SELECT id FROM subscription_payments WHERE razorpay_payment_id = $1 AND id <> $2',
      [params.razorpayPaymentId, payment.id]
    );
    if (dupPid.rows.length > 0) {
      throw new Error('Duplicate payment reference detected');
    }

    await client.query(
      `
      UPDATE subscription_payments
      SET status = 'succeeded',
          razorpay_payment_id = $1,
          razorpay_signature = $2
      WHERE id = $3
      `,
      [params.razorpayPaymentId, params.razorpaySignature, payment.id]
    );

    await client.query(
      `UPDATE subscription_invoices SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [payment.invoice_id]
    );

    const subRes = await client.query(
      'SELECT * FROM tenant_subscriptions WHERE id = $1 FOR UPDATE',
      [payment.subscription_id]
    );
    const sub = subRes.rows[0];
    const newPlanId = params.targetPlanId || sub.plan_id;
    const newInterval = params.billingInterval || sub.billing_interval;

    await client.query(
      `
      UPDATE tenant_subscriptions
      SET plan_id = $1,
          billing_interval = $2,
          status = 'active',
          current_period_start = $3,
          current_period_end = $4,
          next_renewal_at = $4,
          grace_period_ends_at = NULL,
          suspended_at = NULL,
          last_payment_status = 'succeeded',
          reactivated_at = CASE WHEN status IN ('suspended', 'cancelled', 'expired') THEN CURRENT_TIMESTAMP ELSE reactivated_at END
      WHERE id = $5
      `,
      [newPlanId, newInterval, payment.period_start, payment.period_end, sub.id]
    );

    // Keep organizations.status active upon valid payment settlement
    await client.query(`UPDATE organizations SET status = 'active' WHERE id = $1`, [params.organizationId]);

    await logTenantAudit(client, {
      organizationId: params.organizationId,
      actorId: params.actorUserId,
      action: 'subscription_payment_verified',
      entityName: 'tenant_subscriptions',
      entityId: sub.id,
      newData: {
        invoiceId: payment.invoice_id,
        razorpayPaymentId: params.razorpayPaymentId,
        amount: payment.total,
      },
    });

    await recordBillingNotification(client, {
      organizationId: params.organizationId,
      notificationType: 'payment_successful',
      subject: 'Subscription Payment Confirmed',
      summary: `Payment of INR ${payment.total} verified and your subscription is active until ${new Date(payment.period_end).toDateString()}.`,
    });

    return { alreadySettled: false, invoiceId: payment.invoice_id, subscriptionId: sub.id };
  });
}

export async function transitionSubscriptionLifecycle(params: {
  organizationId: string;
  actorUserId: string;
  action:
    | 'downgrade'
    | 'cancel'
    | 'reactivate'
    | 'expire_trial'
    | 'enter_grace_period'
    | 'mark_past_due'
    | 'suspend'
    | 'expire'
    | 'renew_trial_to_active';
  targetPlanId?: string;
  reason?: string;
}) {
  return withTenantContext(params.organizationId, async (client) => {
    const subRes = await client.query(
      'SELECT * FROM tenant_subscriptions WHERE organization_id = $1 FOR UPDATE',
      [params.organizationId]
    );
    if (subRes.rows.length === 0) throw new Error('Subscription not found');
    const sub = subRes.rows[0];

    let newStatus = sub.status;
    let notifType = '';
    let notifSubject = '';
    let notifSummary = '';

    switch (params.action) {
      case 'downgrade': {
        if (!params.targetPlanId) throw new Error('targetPlanId required for downgrade');
        await client.query('UPDATE tenant_subscriptions SET plan_id = $1 WHERE id = $2', [
          params.targetPlanId,
          sub.id,
        ]);
        notifType = 'subscription_downgraded';
        notifSubject = 'Subscription Plan Downgraded';
        notifSummary = 'Your organization subscription plan has been updated.';
        break;
      }
      case 'cancel': {
        newStatus = 'cancelled';
        await client.query(
          `UPDATE tenant_subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = $1 WHERE id = $2`,
          [params.reason || 'Cancelled by administrator', sub.id]
        );
        notifType = 'subscription_cancelled';
        notifSubject = 'Subscription Cancelled';
        notifSummary = 'Your subscription has been cancelled. Healthcare Safety Mode preserves clinical records.';
        break;
      }
      case 'expire_trial': {
        newStatus = 'expired';
        await client.query(
          `UPDATE tenant_subscriptions SET status = 'expired', expired_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [sub.id]
        );
        notifType = 'trial_expired';
        notifSubject = 'Free Trial Expired';
        notifSummary = 'Your 14-day free trial has expired. Upgrade to resume new admissions.';
        break;
      }
      case 'enter_grace_period': {
        newStatus = 'grace_period';
        const graceEnd = new Date(Date.now() + 7 * 86400000);
        await client.query(
          `UPDATE tenant_subscriptions SET status = 'grace_period', grace_period_ends_at = $1, last_payment_status = 'failed' WHERE id = $2`,
          [graceEnd, sub.id]
        );
        notifType = 'payment_failed';
        notifSubject = 'Payment Failed — Grace Period Active';
        notifSummary = `Payment failed. You have a 7-day grace period until ${graceEnd.toDateString()}.`;
        break;
      }
      case 'mark_past_due': {
        newStatus = 'past_due';
        await client.query(
          `UPDATE tenant_subscriptions SET status = 'past_due', last_payment_status = 'failed' WHERE id = $1`,
          [sub.id]
        );
        notifType = 'payment_failed';
        notifSubject = 'Subscription Past Due';
        notifSummary = 'Your subscription is past due. Please update your payment method.';
        break;
      }
      case 'suspend': {
        newStatus = 'suspended';
        await client.query(
          `UPDATE tenant_subscriptions SET status = 'suspended', suspended_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [sub.id]
        );
        notifType = 'subscription_suspended';
        notifSubject = 'Subscription Suspended — Healthcare Safety Mode';
        notifSummary = 'Your subscription is suspended. Essential clinical care remains active.';
        break;
      }
      case 'reactivate': {
        newStatus = 'active';
        const periodEnd = new Date(Date.now() + 30 * 86400000);
        await client.query(
          `UPDATE tenant_subscriptions SET status = 'active', reactivated_at = CURRENT_TIMESTAMP, suspended_at = NULL, cancelled_at = NULL, current_period_end = $1, next_renewal_at = $1 WHERE id = $2`,
          [periodEnd, sub.id]
        );
        await client.query(`UPDATE organizations SET status = 'active' WHERE id = $1`, [params.organizationId]);
        notifType = 'subscription_reactivated';
        notifSubject = 'Subscription Reactivated';
        notifSummary = 'Your organization subscription has been reactivated.';
        break;
      }
      case 'expire': {
        newStatus = 'expired';
        await client.query(
          `UPDATE tenant_subscriptions SET status = 'expired', expired_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [sub.id]
        );
        break;
      }
      case 'renew_trial_to_active': {
        newStatus = 'active';
        const periodEnd = new Date(Date.now() + 30 * 86400000);
        await client.query(
          `UPDATE tenant_subscriptions SET status = 'active', current_period_start = CURRENT_TIMESTAMP, current_period_end = $1, next_renewal_at = $1 WHERE id = $2`,
          [periodEnd, sub.id]
        );
        await client.query(`UPDATE organizations SET status = 'active' WHERE id = $1`, [params.organizationId]);
        break;
      }
    }

    await logTenantAudit(client, {
      organizationId: params.organizationId,
      actorId: params.actorUserId,
      action: `subscription_${params.action}`,
      entityName: 'tenant_subscriptions',
      entityId: sub.id,
      oldData: { status: sub.status },
      newData: { status: newStatus, reason: params.reason || null },
    });

    if (notifType) {
      await recordBillingNotification(client, {
        organizationId: params.organizationId,
        notificationType: notifType,
        subject: notifSubject,
        summary: notifSummary,
      });
    }

    return { subscriptionId: sub.id, previousStatus: sub.status, status: newStatus };
  });
}

export async function listOrganizationInvoicesAndPayments(organizationId: string, limit = 50, offset = 0) {
  return withTenantContext(organizationId, async (client) => {
    const [invRes, payRes, notifRes] = await Promise.all([
      client.query(
        `SELECT * FROM subscription_invoices WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [organizationId, limit, offset]
      ),
      client.query(
        `
        SELECT sp.*, si.invoice_number
        FROM subscription_payments sp
        JOIN subscription_invoices si ON sp.invoice_id = si.id
        WHERE si.organization_id = $1
        ORDER BY sp.created_at DESC LIMIT $2 OFFSET $3
        `,
        [organizationId, limit, offset]
      ),
      client.query(
        `SELECT * FROM billing_notifications WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [organizationId]
      ),
    ]);

    return {
      invoices: invRes.rows,
      payments: payRes.rows,
      notifications: notifRes.rows,
    };
  });
}
