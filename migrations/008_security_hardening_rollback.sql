-- Migration 008 Rollback Script
-- Target: Rollback Migration 008 Security Hardening without destroying existing business data

BEGIN;

-- 1. Preserve Security & Relationship Tables (Do NOT drop user_verification_tokens or resident_family_links)
-- Routine rollback must not destroy pending verification tokens or family-resident authorization links.

-- 2. Drop Composite Foreign Keys
ALTER TABLE IF EXISTS admissions DROP CONSTRAINT IF EXISTS fk_admissions_org_resident;
ALTER TABLE IF EXISTS medical_records DROP CONSTRAINT IF EXISTS fk_medical_records_org_resident;
ALTER TABLE IF EXISTS prescriptions DROP CONSTRAINT IF EXISTS fk_prescriptions_org_resident;
ALTER TABLE IF EXISTS attendance DROP CONSTRAINT IF EXISTS fk_attendance_org_resident;
ALTER TABLE IF EXISTS medication_schedules DROP CONSTRAINT IF EXISTS fk_med_schedules_org_prescription;
ALTER TABLE IF EXISTS beds DROP CONSTRAINT IF EXISTS fk_beds_org_room;
ALTER TABLE IF EXISTS visits DROP CONSTRAINT IF EXISTS fk_visits_org_visitor;

-- 3. Drop Parent Unique Constraints
ALTER TABLE IF EXISTS residents DROP CONSTRAINT IF EXISTS uq_residents_org_id;
ALTER TABLE IF EXISTS rooms DROP CONSTRAINT IF EXISTS uq_rooms_org_id;
ALTER TABLE IF EXISTS prescriptions DROP CONSTRAINT IF EXISTS uq_prescriptions_org_id;
ALTER TABLE IF EXISTS visitors DROP CONSTRAINT IF EXISTS uq_visitors_org_id;
ALTER TABLE IF EXISTS rescue_cases DROP CONSTRAINT IF EXISTS uq_rescue_cases_org_id;

-- 4. Rollback Audit Log Policies & Triggers
DROP TRIGGER IF EXISTS trg_tenant_audit_logs_immutable ON tenant_audit_logs;
DROP TRIGGER IF EXISTS trg_platform_audit_logs_immutable ON platform_audit_logs;
DROP FUNCTION IF EXISTS prevent_audit_log_modification();

DROP POLICY IF EXISTS tenant_audit_logs_select_policy ON tenant_audit_logs;
DROP POLICY IF EXISTS tenant_audit_logs_insert_policy ON tenant_audit_logs;

CREATE POLICY tenant_isolation_policy ON tenant_audit_logs
FOR ALL
USING (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
)
WITH CHECK (
    organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
);

GRANT ALL PRIVILEGES ON tenant_audit_logs TO eldercare_app;
GRANT ALL PRIVILEGES ON platform_audit_logs TO eldercare_app;

DELETE FROM schema_migrations WHERE name = '008_security_hardening.sql';

COMMIT;
