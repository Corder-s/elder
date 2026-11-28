-- ElderCare OS — Stage 3B-7 Rollback Documentation (Non-Destructive)
-- Removes Stage 3B-7 export job queue and new permission assignments without deleting existing documents.

BEGIN;

DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE code IN ('org:data:export', 'document:archive'));

DELETE FROM permissions WHERE code IN ('org:data:export', 'document:archive');

DROP TABLE IF EXISTS tenant_export_jobs;

-- Note: New columns on `documents` are intentionally retained or may be dropped manually
-- only if no Stage 3B-7 documents exist:
-- ALTER TABLE documents DROP COLUMN IF EXISTS branch_id, DROP COLUMN IF EXISTS document_status, ...;

COMMIT;
