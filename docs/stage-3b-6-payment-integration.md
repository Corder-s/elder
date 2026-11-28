# Stage 3B-6 Razorpay Test-Mode Payment Integration

## Guardrails
- `src/lib/billing/payment-provider.ts` explicitly rejects any `RAZORPAY_KEY_ID` starting with `rzp_live_` to prevent accidental live charges.
- Amounts are converted to paise (`Math.round(amountInInr * 100)`) and created in INR.
- Placeholder `rzp_test_placeholder_*` keys operate deterministically offline for automated verification without external network dependencies, while real `rzp_test_*` keys use Razorpay's test Orders API (`https://api.razorpay.com/v1/orders`).

## Checkout & Verification Flow
1. `POST /api/billing/checkout` locks `tenant_subscriptions` (`FOR UPDATE`), creates an `open` invoice in `subscription_invoices`, creates a Razorpay test order, and inserts a `pending` row in `subscription_payments`.
2. `POST /api/billing/verify` verifies HMAC-SHA256 (`${razorpayOrderId}|${razorpayPaymentId}` with `RAZORPAY_KEY_SECRET`) using `crypto.timingSafeEqual`.
3. Duplicate settlement attempts or reused `razorpay_payment_id` references are prevented by idempotency checks and the unique index `idx_subscription_payments_rzp_pid_unique`.
4. Paid invoices are protected by the PostgreSQL `enforce_subscription_invoice_immutability` trigger, preventing modification of monetary totals, currency, or invoice numbers after payment; adjustments use `credit_note` (`CN-`) records.
