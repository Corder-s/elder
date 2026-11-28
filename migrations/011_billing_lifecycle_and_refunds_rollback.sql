-- Migration 011 Rollback Script (Non-Destructive)
-- Removes trigger/indexes added in 011 while preserving all billing, invoice, and payment records.

BEGIN;

DROP TRIGGER IF EXISTS trg_subscription_invoices_immutable ON subscription_invoices;
DROP FUNCTION IF EXISTS prevent_settled_invoice_tampering();
DROP INDEX IF EXISTS uq_sub_payments_razorpay_pid;
DROP INDEX IF EXISTS idx_sub_payments_org;
DROP INDEX IF EXISTS idx_sub_payments_order;
DROP INDEX IF EXISTS idx_billing_notif_org;
DROP INDEX IF EXISTS idx_tenant_sub_status;
DROP INDEX IF EXISTS idx_sub_invoices_status;
DROP INDEX IF EXISTS idx_usage_records_org_metric;

DELETE FROM schema_migrations WHERE name = '011_billing_lifecycle_and_refunds.sql';

COMMIT;
