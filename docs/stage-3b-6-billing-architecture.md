# Stage 3B-6 Billing Architecture

## Module Layout
- `src/lib/billing/plans.ts`: Plan CRUD, slug/UUID lookup, and active-subscriber deactivation guard.
- `src/lib/billing/entitlements.ts`: Feature entitlement checks (`custom_branding`, `api_access`, `audit_export`, `advanced_reports`, `priority_support`) and `evaluateHealthcareSafetyPolicy`.
- `src/lib/billing/quota-service.ts`: Row-locked (`FOR UPDATE OF ts`) transactional quota checks (`enforceResidentQuotaTx`, `enforceStaffQuotaTx`, `enforceBranchQuotaTx`, `enforceStorageQuotaTx`, `getOrganizationUsageSnapshot`).
- `src/lib/billing/payment-provider.ts`: Razorpay test-mode order creation, checkout HMAC-SHA256 verification, and webhook HMAC-SHA256 verification.
- `src/lib/billing/invoice-service.ts`: Sequential `INV-` / `CN-` / `ADJ-` invoice generation and standards-compliant PDF 1.4 buffer export.
- `src/lib/billing/subscription-service.ts`: Checkout initiation, signature verification & settlement, lifecycle state transitions, and billing notification dispatch.
- `src/lib/billing/webhook-service.ts`: Raw-body HMAC verification, `payment_webhook_events` deduplication, out-of-order protection, and DB-only organization resolution.
- `src/lib/subscriptions.ts`: Backward-compatible facade delegating to `src/lib/billing/*`.

## API Surfaces
- **NGO Billing APIs:** `/api/billing/subscription`, `/api/billing/checkout`, `/api/billing/verify`, `/api/billing/invoices`, `/api/billing/invoices/[id]/pdf`.
- **Webhook API:** `/api/webhooks/razorpay`.
- **Platform Owner Billing APIs (MFA required):** `/api/platform/plans`, `/api/platform/subscriptions`, `/api/platform/billing`.

## UI Consoles
- **NGO Admin Billing Console:** `/settings/billing`, `/settings/billing/plans`, `/settings/billing/invoices`, `/settings/billing/payment-history`, `/settings/billing/usage`.
- **Platform Owner Billing Console:** `/platform/subscriptions`, `/platform/plans`, `/platform/payments`, `/platform/invoices`, `/platform/usage`, `/platform/audit-logs`, `/platform/settings`.
