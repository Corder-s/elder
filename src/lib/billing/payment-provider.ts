/**
 * ElderCare OS — Razorpay Payment Provider Abstraction (Test Mode Only)
 * Enforces server-side HMAC-SHA256 verification and rejects live credentials in test mode.
 */

import crypto from 'crypto';

export interface RazorpayOrderResult {
  orderId: string;
  amountInPaise: number;
  currency: string;
  receipt: string;
  mode: 'razorpay_test_api' | 'razorpay_offline_test';
  keyId: string;
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  if (keyId.startsWith('rzp_live_')) {
    throw new Error('Live Razorpay credentials are prohibited in Stage 3B-6 test mode.');
  }

  return { keyId, keySecret, webhookSecret };
}

export async function createRazorpayTestOrder(params: {
  amountInInr: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResult> {
  const { keyId, keySecret } = getRazorpayConfig();
  const currency = (params.currency || 'INR').toUpperCase();
  const amountInPaise = Math.round(params.amountInInr * 100);

  if (amountInPaise <= 0) {
    throw new Error('Order amount must be greater than zero');
  }

  const isRealTestKey =
    keyId.startsWith('rzp_test_') &&
    !keyId.includes('placeholder') &&
    keySecret &&
    !keySecret.includes('placeholder');

  if (isRealTestKey) {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: params.receipt,
        notes: params.notes || {},
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.description || 'Failed to create Razorpay test order');
    }

    return {
      orderId: data.id,
      amountInPaise: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      mode: 'razorpay_test_api',
      keyId,
    };
  }

  // Deterministic offline test mode order (no external network call required)
  const orderId = `order_test_${crypto.randomBytes(8).toString('hex')}`;
  return {
    orderId,
    amountInPaise,
    currency,
    receipt: params.receipt,
    mode: 'razorpay_offline_test',
    keyId: keyId || 'rzp_test_placeholder',
  };
}

export function verifyRazorpayCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = getRazorpayConfig();
  if (!keySecret || !params.orderId || !params.paymentId || !params.signature) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');

  const sigBuf = Buffer.from(params.signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret || !rawBody || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
