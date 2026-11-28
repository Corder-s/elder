# Billing & Subscription Audit — ElderCare OS

## Verified Controls
- **Lifecycle & Plans:** `trial`, `pending_payment`, `active`, `grace_period`, `past_due`, `suspended`, `cancelled`, `expired` states tracked in `tenant_subscriptions`; Starter, Professional, and Enterprise plans seeded with deactivation protection for active subscribers.
- **Razorpay Test-Mode Integration:** `src/lib/billing/payment-provider.ts` enforces test-mode only (`rzp_live_` rejected); checkout verification (`/api/billing/verify`) and webhook processing (`/api/webhooks/razorpay`) verify HMAC-SHA256 signatures, deduplicate `event_id`s, and resist out-of-order `payment.failed` regressions.
- **Invoices & Quotas:** Paid invoices are protected by the PostgreSQL `enforce_subscription_invoice_immutability` trigger; PDF 1.4 invoices download via `/api/billing/invoices/[id]/pdf`; resident, staff, branch, storage, and document-AI quotas are enforced transactionally with `FOR UPDATE OF ts`.
- **Healthcare Safety Mode:** Billing suspension preserves clinical staff sessions, resident reads, medication reads, and daily care diary logging while blocking new admissions, staff invites, branches, uploads, and AI processing.

## Gaps
- **EXTERNAL DEPENDENCY — Live Razorpay Credentials & Webhook URL:** `.env` uses placeholder test keys (`rzp_test_placeholder`). Production requires live Razorpay keys, registered webhook URL, and GST configuration in `platform_billing_settings`.
