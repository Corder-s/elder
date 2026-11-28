-- ElderCare OS — Stage 3B-8 Rollback Documentation (Non-Destructive)

BEGIN;

DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN (
        'document:process', 'document:extraction:read', 'document:review',
        'document:approve', 'form:draft:create', 'form:read', 'form:submit'
    )
);

DELETE FROM permissions WHERE code IN (
    'document:process', 'document:extraction:read', 'document:review',
    'document:approve', 'form:draft:create', 'form:read', 'form:submit'
);

DROP TABLE IF EXISTS generated_form_drafts;
DROP TABLE IF EXISTS document_review_records;
DROP TABLE IF EXISTS document_extraction_results;
DROP TABLE IF EXISTS document_processing_jobs;

COMMIT;
