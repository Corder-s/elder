# Stage 3B-7 Data Retention & Cleanup Policy

## Automated Cleanup (`src/lib/storage/retention-cleanup.ts` & `scripts/run-export-worker.js`)
1. **Expired Pending Uploads:** `pending_upload` documents past `upload_expires_at` (5 minutes) are transitioned to `rejected`, `reserved_bytes` is reset to `0`, and any orphaned S3 object is deleted.
2. **Quarantined / Rejected Files:** Rejected uploads have their S3 object deleted immediately during verification and do not count toward storage quota.
3. **Expired Export Archives:** Completed `tenant_export_jobs` past `expires_at` (72 hours) are transitioned to `expired`, their S3 archive is deleted, and `tenant_export_expired` is logged to `tenant_audit_logs`.
4. **Archived Documents:** `PATCH /api/documents/[id]` (`action: 'archive'`) performs a soft archival (`document_status = 'archived'`, `archived_at`, `archived_by`, `archive_reason`) and writes an audit record, preserving legal/medical records rather than hard-deleting them.
