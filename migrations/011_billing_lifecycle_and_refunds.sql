-- Migration 011: Stage 3B-6 Subscription Lifecycle, Billing Automation, Invoices, Refunds & Notifications
-- Strict Compliance: Additive, Non-Destructive, Preserves All Existing Plans, Subscriptions & Data

ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'expired';

BEGIN;

-- 1. Extend tenant_subscriptions for complete lifecycle tracking
ALTER TABLE tenant_subscriptions
    ADD COLUMN IF NOT EXISTS next_renewal_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

-- 2. Extend subscription_invoices for credit notes, adjustments, billing metadata & immutability
ALTER TABLE subscription_invoices
    ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(30) NOT NULL DEFAULT 'invoice',
    ADD COLUMN IF NOT EXISTS related_invoice_id UUID REFERENCES subscription_invoices(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS billing_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Immutability guard: settled ('paid' or 'void') invoices cannot have amounts or status rewritten silently
CREATE OR REPLACE FUNCTION prevent_settled_invoice_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('paid', 'void') THEN
        IF NEW.subtotal <> OLD.subtotal OR NEW.tax_amount <> OLD.tax_amount OR NEW.total <> OLD.total OR NEW.currency <> OLD.currency THEN
            RAISE EXCEPTION 'Settled financial invoices are immutable. Issue a credit_note or adjustment record instead.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscription_invoices_immutable ON subscription_invoices;
CREATE TRIGGER trg_subscription_invoices_immutable
BEFORE UPDATE ON subscription_invoices
FOR EACH ROW EXECUTE FUNCTION prevent_settled_invoice_tampering();

-- 3. Extend subscription_payments for org isolation, unique gateway payment IDs, and refunds
ALTER TABLE subscription_payments
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS refund_reason TEXT,
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS razorpay_refund_id VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_payments_razorpay_pid
    ON subscription_payments(razorpay_payment_id)
    WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sub_payments_org ON subscription_payments(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_payments_order ON subscription_payments(razorpay_order_id);

-- 4. Billing Notifications Log
CREATE TABLE IF NOT EXISTS billing_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'sent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_notif_org ON billing_notifications(organization_id, created_at DESC);

-- 5. Platform Billing Configuration (non-secret settings only)
CREATE TABLE IF NOT EXISTS platform_billing_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_billing_settings (key, value) VALUES
('default_trial_days', '{"days": 14}'::jsonb),
('grace_period_days', '{"days": 7}'::jsonb),
('gateway_mode', '{"provider": "razorpay", "mode": "test"}'::jsonb),
('healthcare_safety_mode', '{"enabled": true, "allowClinicalReadDuringSuspension": true, "blockNewAdmissionsDuringSuspension": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 6. Additional Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_sub_status ON tenant_subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_status ON subscription_invoices(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_org_metric ON usage_records(organization_id, metric_name);

-- 7. Platform Owner SaaS Billing RLS Policy on tenant_subscriptions & subscription_invoices
-- Allows MFA-verified Platform Owner context (`app.is_platform_admin = 'true'`) to manage SaaS billing
-- while keeping strict tenant isolation for all NGO sessions and zero access to clinical tables.
DROP POLICY IF EXISTS platform_billing_admin_policy ON tenant_subscriptions;
CREATE POLICY platform_billing_admin_policy ON tenant_subscriptions
    FOR ALL
    USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true')
    WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true');

DROP POLICY IF EXISTS platform_billing_admin_policy ON subscription_invoices;
CREATE POLICY platform_billing_admin_policy ON subscription_invoices
    FOR ALL
    USING (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true')
    WITH CHECK (NULLIF(current_setting('app.is_platform_admin', true), '') = 'true');

-- 8. Grants for eldercare_app
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eldercare_app') THEN
        GRANT SELECT, INSERT, UPDATE ON subscription_plans TO eldercare_app;
        GRANT SELECT, INSERT, UPDATE ON tenant_subscriptions TO eldercare_app;
        GRANT SELECT, INSERT, UPDATE ON subscription_invoices TO eldercare_app;
        GRANT SELECT, INSERT, UPDATE ON subscription_payments TO eldercare_app;
        GRANT SELECT, INSERT, UPDATE ON payment_webhook_events TO eldercare_app;
        GRANT SELECT, INSERT, UPDATE ON billing_notifications TO eldercare_app;
        GRANT SELECT, INSERT, UPDATE ON platform_billing_settings TO eldercare_app;
    END IF;
END $$;

COMMIT;
