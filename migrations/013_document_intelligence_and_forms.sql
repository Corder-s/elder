-- ElderCare OS — Stage 3B-8 Additive Migration
-- OCR, AI Document Intelligence, Human Review Workflow & Digital Form Drafts
-- Safe, additive-only migration; preserves all Stage 3B-2 through 3B-7 data.

BEGIN;

-- 1. Document Processing Jobs Queue
CREATE TABLE IF NOT EXISTS document_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    provider_name VARCHAR(64) NOT NULL DEFAULT 'builtin_pdf_ocr',
    progress_percent INTEGER NOT NULL DEFAULT 0,
    current_step VARCHAR(120) DEFAULT 'Queued for OCR',
    page_count INTEGER,
    detected_language VARCHAR(32),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    locked_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_proc_jobs_org_created
    ON document_processing_jobs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_proc_jobs_doc
    ON document_processing_jobs(organization_id, document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_proc_jobs_queue
    ON document_processing_jobs(status, created_at ASC)
    WHERE status IN ('queued', 'processing');

DROP TRIGGER IF EXISTS trg_doc_proc_jobs_updated_at ON document_processing_jobs;
CREATE TRIGGER trg_doc_proc_jobs_updated_at
BEFORE UPDATE ON document_processing_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Document Extraction Results
CREATE TABLE IF NOT EXISTS document_extraction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID NOT NULL UNIQUE REFERENCES document_processing_jobs(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    predicted_category VARCHAR(64) NOT NULL,
    classification_confidence NUMERIC(5, 4) NOT NULL DEFAULT 0,
    alternative_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_text TEXT,
    pages_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    field_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_injection_detected BOOLEAN NOT NULL DEFAULT false,
    requires_manual_review BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_extract_org_doc
    ON document_extraction_results(organization_id, document_id);

DROP TRIGGER IF EXISTS trg_doc_extract_updated_at ON document_extraction_results;
CREATE TRIGGER trg_doc_extract_updated_at
BEFORE UPDATE ON document_extraction_results
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Human Review & Revision History Records
CREATE TABLE IF NOT EXISTS document_review_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES document_processing_jobs(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(32) NOT NULL,
    verified_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    edited_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_reviews_job
    ON document_review_records(organization_id, job_id, created_at DESC);

-- 4. Generated Digital Form Drafts
CREATE TABLE IF NOT EXISTS generated_form_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    source_job_id UUID REFERENCES document_processing_jobs(id) ON DELETE SET NULL,
    form_type VARCHAR(64) NOT NULL,
    form_version VARCHAR(16) NOT NULL DEFAULT '1.0',
    title VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    schema_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMPTZ,
    target_entity_type VARCHAR(64),
    target_entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gen_forms_org_status
    ON generated_form_drafts(organization_id, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_gen_forms_updated_at ON generated_form_drafts;
CREATE TRIGGER trg_gen_forms_updated_at
BEFORE UPDATE ON generated_form_drafts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable strict fail-closed RLS on all 4 Stage 3B-8 tables
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'document_processing_jobs',
        'document_extraction_results',
        'document_review_records',
        'generated_form_drafts'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %I
             FOR ALL
             USING (organization_id = NULLIF(current_setting(''app.current_organization_id'', true), '''')::uuid)
             WITH CHECK (organization_id = NULLIF(current_setting(''app.current_organization_id'', true), '''')::uuid);',
            tbl
        );
    END LOOP;
END $$;

-- 6. Granular Permissions for Document Intelligence & Form Generation
INSERT INTO permissions (code, name, domain, description)
VALUES
    ('document:process', 'Process Documents with OCR/AI', 'document', 'Submit uploaded documents to OCR and extraction queue'),
    ('document:extraction:read', 'View Document Extractions', 'document', 'View OCR text, classification, and extracted fields'),
    ('document:review', 'Review Document Extractions', 'document', 'Edit and verify extracted document fields'),
    ('document:approve', 'Approve Document Extractions', 'document', 'Approve or reject document extractions for form generation'),
    ('form:draft:create', 'Create Digital Form Drafts', 'resident', 'Generate digital form drafts from approved extractions'),
    ('form:read', 'View Digital Forms', 'resident', 'View generated digital form drafts and submissions'),
    ('form:submit', 'Submit Digital Forms', 'resident', 'Submit approved digital forms into operational records')
ON CONFLICT (code) DO NOTHING;

-- Assign to existing roles:
-- Admin gets all 7
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'document:process', 'document:extraction:read', 'document:review',
    'document:approve', 'form:draft:create', 'form:read', 'form:submit'
)
WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;

-- Doctor gets extraction read, review, approve, and form read/draft/submit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'document:process', 'document:extraction:read', 'document:review',
    'document:approve', 'form:draft:create', 'form:read', 'form:submit'
)
WHERE r.slug = 'doctor'
ON CONFLICT DO NOTHING;

-- Staff gets process, extraction read, review, form draft/read (cannot approve medical or final-approve)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'document:process', 'document:extraction:read', 'document:review',
    'form:draft:create', 'form:read'
)
WHERE r.slug = 'staff'
ON CONFLICT DO NOTHING;

-- Nurse gets extraction read and form read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('document:extraction:read', 'form:read')
WHERE r.slug = 'nurse'
ON CONFLICT DO NOTHING;

-- 7. Grants for eldercare_app
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eldercare_app') THEN
        GRANT SELECT, INSERT, UPDATE ON document_processing_jobs TO eldercare_app;
        GRANT SELECT, INSERT, UPDATE ON document_extraction_results TO eldercare_app;
        GRANT SELECT, INSERT ON document_review_records TO eldercare_app;
        GRANT SELECT, INSERT, UPDATE ON generated_form_drafts TO eldercare_app;
    END IF;
END $$;

COMMIT;
