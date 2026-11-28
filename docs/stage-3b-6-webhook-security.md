# Stage 3B-6 Webhook Security

## Endpoint
`POST /api/webhooks/razorpay`

## Security Controls
1. **Raw-Body HMAC-SHA256 Verification:** Reads exact raw request text (`await req.text()`) and verifies `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET` (fallback `RAZORPAY_KEY_SECRET`) using `crypto.timingSafeEqual`. Forged or missing signatures return `401 Unauthorized`.
2. **Atomic Deduplication:** Inserts `event_id` (`x-razorpay-event-id` header, `payload.id`, or SHA-256 hash of raw body) into `payment_webhook_events` with `ON CONFLICT (event_id) DO NOTHING`. Duplicate deliveries return `200 { received: true, duplicate: true }` without re-running settlement.
3. **Database-Only Tenant Resolution:** Never trusts `organization_id` from webhook JSON payloads; resolves the tenant exclusively from `subscription_payments` / `subscription_invoices` matched by `razorpay_order_id` or `razorpay_payment_id`.
4. **Out-of-Order Event Safety:** `payment.failed` events do not overwrite an already `paid` invoice or `succeeded` payment, preventing late failure webhooks from regressing an active subscription.
