# Stage 3B-6 Pre-Flight Audit

## Baseline Inspected
- **Database Schema (`migrations/002_saas_billing.sql`, `migrations/004_tenant_rls.sql`):**
  - Existing tables: `subscription_plans`, `tenant_subscriptions`, `subscription_invoices`, `subscription_payments`, `payment_webhook_events`, `usage_records`, `platform_audit_logs`.
  - Gap identified: `subscription_status` enum lacked `pending_payment` and `expired`; `tenant_subscriptions` lacked `grace_period_ends_at`, `past_due_since`, `suspended_at`, `reactivated_at`, `last_payment_status`, and `cancelled_by`; `subscription_invoices` lacked `invoice_type`, `related_invoice_id`, `billing_details`, `notes`, and an immutability trigger; `subscription_payments` lacked `organization_id`, `refund_id`, `refund_amount`, `refunded_at`, `refund_reason`, and unique index on `razorpay_payment_id`; `billing_notifications` and `platform_billing_settings` tables did not exist.
  - Resolution: Created additive migration `migrations/011_billing_lifecycle_and_refunds.sql` (and rollback `migrations/011_billing_lifecycle_and_refunds_rollback.sql`).
- **Quota & Operational Enforcement:**
  - `src/app/api/residents/route.ts` and `src/app/api/rescue-cases/[id]/convert/route.ts` had inline non-locking quota checks. Replaced with `enforceResidentQuotaTx` (`FOR UPDATE OF ts`).
  - `src/app/api/documents/route.ts` lacked storage quota enforcement. Wired `enforceStorageQuotaTx`.
  - `src/app/api/staff/route.ts`, `src/app/api/staff/[id]/route.ts`, and `src/app/api/settings/route.ts` wired with `enforceStaffQuotaTx` and `enforceBranchQuotaTx`.
  - `src/app/api/reports/route.ts` wired with `checkFeatureEntitlement(orgId, 'advanced_reports')` while preserving core clinical/operational reports.
- **Safety & Isolation:**
  - Production DB `eldercareos` remains untouched; all migrations and test runs target `eldercareos_restore_test`.
  - Razorpay integration enforces test-mode only and rejects `rzp_live_` credentials.
