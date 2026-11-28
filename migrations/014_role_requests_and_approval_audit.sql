-- ElderCare OS — Stage 3B-9 Additive Migration
-- Registration Account-Type Requests, Approval Workflow & Role Assignment History
-- Safe, additive-only migration; preserves all Stage 3B-2 through 3B-8 data.

BEGIN;

-- 1. Registration & Role Approval Requests (per-NGO, RLS-isolated)
CREATE TABLE IF NOT EXISTS registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requested_account_type VARCHAR(64) NOT NULL,
    assigned_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    assigned_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_registration_request_user_org UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_reg_requests_org_status
    ON registration_requests(organization_id, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_reg_requests_updated_at ON registration_requests;
CREATE TRIGGER trg_reg_requests_updated_at
BEFORE UPDATE ON registration_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Role Assignment & Approval History
CREATE TABLE IF NOT EXISTS role_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(32) NOT NULL,
    previous_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    new_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    previous_status VARCHAR(32),
    new_status VARCHAR(32),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_role_history_org_target
    ON role_assignment_history(organization_id, target_user_id, created_at DESC);

-- 3. Enable strict fail-closed RLS on both new tables
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON registration_requests;
CREATE POLICY tenant_isolation_policy ON registration_requests
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

ALTER TABLE role_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignment_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON role_assignment_history;
CREATE POLICY tenant_isolation_policy ON role_assignment_history
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

-- 4. Grants for eldercare_app
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eldercare_app') THEN
        GRANT SELECT, INSERT, UPDATE ON registration_requests TO eldercare_app;
        GRANT SELECT, INSERT ON role_assignment_history TO eldercare_app;
    END IF;
END $$;

COMMIT;
