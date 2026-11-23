-- Migration 008: Database Security Hardening & Composite Tenant Integrity
-- Target: ElderCare OS PostgreSQL Schema
-- Strict Compliance: Additive, Backward-Compatible, Non-Destructive

BEGIN;

-- ============================================================================
-- 1. IMMUTABLE AUDIT LOGS (Defense-in-Depth: RLS Policy + Trigger + SQL Grants)
-- ============================================================================

-- A. Trigger function to physically reject UPDATE and DELETE
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit records are cryptographically immutable. UPDATE and DELETE operations are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

-- B. Attach immutability triggers
DROP TRIGGER IF EXISTS trg_tenant_audit_logs_immutable ON tenant_audit_logs;
CREATE TRIGGER trg_tenant_audit_logs_immutable
BEFORE UPDATE OR DELETE ON tenant_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_platform_audit_logs_immutable ON platform_audit_logs;
CREATE TRIGGER trg_platform_audit_logs_immutable
BEFORE UPDATE OR DELETE ON platform_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- C. Restructure RLS policies on tenant_audit_logs to be INSERT and SELECT only
DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_audit_logs;

CREATE POLICY tenant_audit_logs_select_policy ON tenant_audit_logs
FOR SELECT
USING (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
);

CREATE POLICY tenant_audit_logs_insert_policy ON tenant_audit_logs
FOR INSERT
WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
);

-- D. Restrict application database privileges on audit tables
REVOKE UPDATE, DELETE, TRUNCATE ON tenant_audit_logs FROM eldercare_app;
REVOKE UPDATE, DELETE, TRUNCATE ON platform_audit_logs FROM eldercare_app;
GRANT SELECT, INSERT ON tenant_audit_logs TO eldercare_app;
GRANT SELECT, INSERT ON platform_audit_logs TO eldercare_app;


-- ============================================================================
-- 2. COMPOSITE TENANT-AWARE CONSTRAINTS (Prevent Cross-Tenant Foreign Keys)
-- ============================================================================

-- A. Unique parent constraints on (organization_id, id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_residents_org_id') THEN
        ALTER TABLE residents ADD CONSTRAINT uq_residents_org_id UNIQUE (organization_id, id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_rooms_org_id') THEN
        ALTER TABLE rooms ADD CONSTRAINT uq_rooms_org_id UNIQUE (organization_id, id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_prescriptions_org_id') THEN
        ALTER TABLE prescriptions ADD CONSTRAINT uq_prescriptions_org_id UNIQUE (organization_id, id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_visitors_org_id') THEN
        ALTER TABLE visitors ADD CONSTRAINT uq_visitors_org_id UNIQUE (organization_id, id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_rescue_cases_org_id') THEN
        ALTER TABLE rescue_cases ADD CONSTRAINT uq_rescue_cases_org_id UNIQUE (organization_id, id);
    END IF;
END $$;

-- B. Composite Foreign Key Constraints
DO $$
BEGIN
    -- 1. admissions -> residents
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_admissions_org_resident') THEN
        ALTER TABLE admissions ADD CONSTRAINT fk_admissions_org_resident
        FOREIGN KEY (organization_id, resident_id)
        REFERENCES residents(organization_id, id) ON DELETE CASCADE;
    END IF;

    -- 2. medical_records -> residents
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_medical_records_org_resident') THEN
        ALTER TABLE medical_records ADD CONSTRAINT fk_medical_records_org_resident
        FOREIGN KEY (organization_id, resident_id)
        REFERENCES residents(organization_id, id) ON DELETE CASCADE;
    END IF;

    -- 3. prescriptions -> residents
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prescriptions_org_resident') THEN
        ALTER TABLE prescriptions ADD CONSTRAINT fk_prescriptions_org_resident
        FOREIGN KEY (organization_id, resident_id)
        REFERENCES residents(organization_id, id) ON DELETE CASCADE;
    END IF;

    -- 4. attendance -> residents
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_org_resident') THEN
        ALTER TABLE attendance ADD CONSTRAINT fk_attendance_org_resident
        FOREIGN KEY (organization_id, resident_id)
        REFERENCES residents(organization_id, id) ON DELETE CASCADE;
    END IF;

    -- 5. medication_schedules -> prescriptions
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_med_schedules_org_prescription') THEN
        ALTER TABLE medication_schedules ADD CONSTRAINT fk_med_schedules_org_prescription
        FOREIGN KEY (organization_id, prescription_id)
        REFERENCES prescriptions(organization_id, id) ON DELETE CASCADE;
    END IF;

    -- 6. beds -> rooms
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_beds_org_room') THEN
        ALTER TABLE beds ADD CONSTRAINT fk_beds_org_room
        FOREIGN KEY (organization_id, room_id)
        REFERENCES rooms(organization_id, id) ON DELETE CASCADE;
    END IF;

    -- 7. visits -> visitors
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_visits_org_visitor') THEN
        ALTER TABLE visits ADD CONSTRAINT fk_visits_org_visitor
        FOREIGN KEY (organization_id, visitor_id)
        REFERENCES visitors(organization_id, id) ON DELETE CASCADE;
    END IF;
END $$;


-- ============================================================================
-- 3. ADDITIONAL SECURITY TABLES FOR STAGES 3B-3 & 3B-4
-- ============================================================================

-- A. One-Time Account Verification & Recovery Tokens
CREATE TABLE IF NOT EXISTS user_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type VARCHAR(50) NOT NULL, -- 'email_verification', 'password_reset'
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verif_tokens_hash ON user_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_verif_tokens_user ON user_verification_tokens(user_id);

-- B. Family Member to Resident Scoping
CREATE TABLE IF NOT EXISTS resident_family_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    relationship VARCHAR(100) NOT NULL,
    can_view_vitals BOOLEAN NOT NULL DEFAULT true,
    can_view_records BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_family_user_resident UNIQUE (user_id, resident_id)
);

ALTER TABLE resident_family_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_family_links FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON resident_family_links;
CREATE POLICY tenant_isolation_policy ON resident_family_links
FOR ALL
USING (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
)
WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
);

GRANT ALL PRIVILEGES ON user_verification_tokens TO eldercare_app;
GRANT ALL PRIVILEGES ON resident_family_links TO eldercare_app;

COMMIT;
