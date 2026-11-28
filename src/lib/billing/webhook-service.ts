/**
 * ElderCare OS — Idempotent Razorpay Webhook Processor
 * Validates raw-body HMAC signature, prevents duplicate processing,
 * handles out-of-order events, and resolves organization strictly from DB records.
 */

import crypto from 'crypto';
import { getDbPool, withTenantContext } from '@/lib/db';
import { verifyRazorpayWebhookSignature } from './payment-provider';
import { recordBillingNotification } from './subscription-service';

export async function processRazorpayWebhook(params: {
  rawBody: string;
  signature: string;
  headerEventId?: string | null;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  // 1. Mandatory raw-body HMAC signature verification
  if (!verifyRazorpayWebhookSignature(params.rawBody, params.signature)) {
    return { status: 401, body: { error: 'Invalid webhook signature' } };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(params.rawBody);
  } catch {
    return { status: 400, body: { error: 'Invalid JSON webhook payload' } };
  }

  const eventType: string = parsed?.event || 'unknown';
  const eventId: string =
    params.headerEventId ||
    parsed?.id ||
    crypto.createHash('sha256').update(params.rawBody).digest('hex');

  const pool = getDbPool();

  // 2. Atomic idempotency check via unique event_id
  const insertEvent = await pool.query(
    `
    INSERT INTO payment_webhook_events (event_id, event_type, gateway, payload, status)
    VALUES ($1, $2, 'razorpay', $3::jsonb, 'pending')
    ON CONFLICT (event_id) DO NOTHING
    RETURNING id;
    `,
    [eventId, eventType, JSON.stringify({ event: eventType, payloadKeys: Object.keys(parsed?.payload || {}) })]
  );

  if (insertEvent.rows.length === 0) {
    return { status: 200, body: { received: true, duplicate: true, eventId } };
  }

  const webhookRowId = insertEvent.rows[0].id;

  try {
    const paymentEntity = parsed?.payload?.payment?.entity;
    const refundEntity = parsed?.payload?.refund?.entity;
    const orderId = paymentEntity?.order_id || parsed?.payload?.order?.entity?.id;
    const paymentId = paymentEntity?.id || refundEntity?.payment_id;

    // Resolve organization strictly from DB (NEVER trust untrusted organization_id in webhook payload)
    // Query subscription_payments directly first because subscription_invoices has FORCE RLS.
    let matchedPaymentRow: any = null;
    if (orderId || paymentId) {
      const lookup = await pool.query(
        `
        SELECT id, organization_id, invoice_id
        FROM subscription_payments
        WHERE ($1::text IS NOT NULL AND razorpay_order_id = $1)
           OR ($2::text IS NOT NULL AND razorpay_payment_id = $2)
        LIMIT 1
        `,
        [orderId || null, paymentId || null]
      );
      matchedPaymentRow = lookup.rows[0] || null;
    }

    if (!matchedPaymentRow || !matchedPaymentRow.organization_id) {
      await pool.query(
        `UPDATE payment_webhook_events SET status = 'processed', processed_at = CURRENT_TIMESTAMP, error_message = 'No matching local order/payment' WHERE id = $1`,
        [webhookRowId]
      );
      return { status: 200, body: { received: true, ignored: true, reason: 'No matching order' } };
    }

    const orgId = matchedPaymentRow.organization_id;

    await withTenantContext(orgId, async (client) => {
      const detailRes = await client.query(
        `
        SELECT sp.*, si.subscription_id, si.period_start, si.period_end, si.total, si.status AS inv_status
        FROM subscription_payments sp
        JOIN subscription_invoices si ON sp.invoice_id = si.id
        WHERE sp.id = $1
        FOR UPDATE OF sp
        `,
        [matchedPaymentRow.id]
      );
      const matchedPayment = detailRes.rows[0];
      if (!matchedPayment) return;

      if (eventType === 'payment.captured' || eventType === 'payment.authorized' || eventType === 'subscription.charged') {
        if (matchedPayment.inv_status !== 'paid') {
          await client.query(
            `UPDATE subscription_payments SET status = 'succeeded', razorpay_payment_id = COALESCE(razorpay_payment_id, $1) WHERE id = $2`,
            [paymentId || null, matchedPayment.id]
          );
          await client.query(
            `UPDATE subscription_invoices SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [matchedPayment.invoice_id]
          );
          await client.query(
            `UPDATE tenant_subscriptions SET status = 'active', last_payment_status = 'succeeded', grace_period_ends_at = NULL WHERE id = $1`,
            [matchedPayment.subscription_id]
          );
          await client.query(`UPDATE organizations SET status = 'active' WHERE id = $1`, [orgId]);
        }
      } else if (eventType === 'payment.failed' || eventType === 'subscription.halted') {
        // Out-of-order protection: do not downgrade if invoice is already paid
        if (matchedPayment.inv_status !== 'paid') {
          await client.query(
            `UPDATE subscription_payments SET status = 'failed', error_code = $1, error_description = $2 WHERE id = $3`,
            [paymentEntity?.error_code || 'PAYMENT_FAILED', paymentEntity?.error_description || 'Gateway payment failed', matchedPayment.id]
          );
          const graceEnd = new Date(Date.now() + 7 * 86400000);
          await client.query(
            `UPDATE tenant_subscriptions SET status = 'grace_period', grace_period_ends_at = $1, last_payment_status = 'failed' WHERE id = $2`,
            [graceEnd, matchedPayment.subscription_id]
          );
          await recordBillingNotification(client, {
            organizationId: orgId,
            notificationType: 'payment_failed',
            subject: 'Payment Failed — Grace Period Started',
            summary: 'A subscription payment failed. Your workspace has entered a 7-day grace period.',
          });
        }
      } else if (eventType === 'refund.processed' && refundEntity) {
        const refundInr = Math.round(((refundEntity.amount || 0) / 100) * 100) / 100;
        await client.query(
          `UPDATE subscription_payments SET status = 'refunded', refunded_amount = $1, razorpay_refund_id = $2, refunded_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [refundInr, refundEntity.id || null, matchedPayment.id]
        );
      }
    });

    await pool.query(
      `UPDATE payment_webhook_events SET status = 'processed', processed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [webhookRowId]
    );

    return { status: 200, body: { received: true, processed: true, eventId, eventType } };
  } catch (err: any) {
    await pool.query(
      `UPDATE payment_webhook_events SET status = 'failed', error_message = $1 WHERE id = $2`,
      [err.message || 'Webhook processing error', webhookRowId]
    );
    return { status: 500, body: { error: 'Webhook processing failed' } };
  }
}
