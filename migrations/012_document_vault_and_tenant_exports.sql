-- ElderCare OS — Stage 3B-7 Additive Migration
-- Secure Document Vault, Storage Reservation, Malware Scan State & Tenant Data Portability
-- Safe, additive-only migration; preserves all Stage 3B-2 through 3B-6 data.

BEGIN;

-- 1. Extend documents table with upload lifecycle, branch scoping, checksums, and retention
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS document_status VARCHAR(32) NOT NULL DEFAULT 'available',
    ADD COLUMN IF NOT EXISTS scan_status VARCHAR(32) NOT NULL DEFAULT 'not_scanned',
    ADD COLUMN IF NOT EXISTS declared_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS verified_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS reserved_bytes BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sha256_checksum VARCHAR(64),
    ADD COLUMN IF NOT EXISTS upload_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS uploaded_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS archive_reason TEXT,
    ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_documents_org_status_created
    ON documents(organization_id, document_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_org_resident
    ON documents(organization_id, resident_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_branch
    ON documents(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_documents_pending_expiry
    ON documents(document_status, upload_expires_at)
    WHERE document_status = 'pending_upload';

-- 2. Create tenant_export_jobs table for asynchronous NGO data portability
CREATE TABLE IF NOT EXISTS tenant_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    export_format VARCHAR(16) NOT NULL DEFAULT 'zip',
    include_documents BOOLEAN NOT NULL DEFAULT true,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    current_step VARCHAR(100),
    record_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    s3_key TEXT,
    file_size_bytes BIGINT,
    sha256_checksum VARCHAR(64),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    locked_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_org_created
    ON tenant_export_jobs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_worker_queue
    ON tenant_export_jobs(status, created_at ASC)
    WHERE status IN ('queued', 'processing');

DROP TRIGGER IF EXISTS trg_tenant_export_jobs_updated_at ON tenant_export_jobs;
CREATE TRIGGER trg_tenant_export_jobs_updated_at
BEFORE UPDATE ON tenant_export_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Enable strict fail-closed RLS on tenant_export_jobs
ALTER TABLE tenant_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_export_jobs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_export_jobs;
CREATE POLICY tenant_isolation_policy ON tenant_export_jobs
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

-- 4. Seed org:data:export and document:archive permissions and assign to NGO admin roles
INSERT INTO permissions (code, name, domain, description)
VALUES
    ('org:data:export', 'Export Organization Data', 'organization', 'Request and download full tenant data portability archives'),
    ('document:archive', 'Archive Documents', 'document', 'Archive or soft-retire documents subject to retention policy')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('org:data:export', 'document:archive')
WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;

-- 5. Grants for eldercare_app
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eldercare_app') THEN
        GRANT SELECT, INSERT, UPDATE ON tenant_export_jobs TO eldercare_app;
    END IF;
END $$;

COMMIT;
