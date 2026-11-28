import { NextRequest, NextResponse } from 'next/server';
import { processRazorpayWebhook } from '@/lib/billing/webhook-service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const headerEventId = req.headers.get('x-razorpay-event-id');

    const result = await processRazorpayWebhook({
      rawBody,
      signature,
      headerEventId,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error: any) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json({ error: error?.message || 'Webhook processing failed' }, { status: 500 });
  }
}
