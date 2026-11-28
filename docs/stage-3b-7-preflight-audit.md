# Stage 3B-7 Pre-Flight Audit

## Baseline Inspected
- **API (`src/app/api/documents/route.ts`):**
  - `POST` previously generated an `s3Key` string and inserted metadata into `documents`, **without** uploading file bytes to private object storage, generating presigned URLs, or verifying magic-byte signatures/checksums.
  - `GET` returned `s3_key` directly in the JSON payload and lacked branch filtering, status filtering, and pagination.
- **UI (`src/app/documents/page.tsx`):**
  - Previously rendered fake fixture data from `dataService.getDocuments()` (`mockDataService`) with no real upload, download, preview, or archive workflow.
- **Database Schema (`migrations/003_operational_tables.sql`, `migrations/005_seed_plans_permissions.sql`):**
  - `documents` lacked `branch_id`, `document_status`, `scan_status`, `declared_size_bytes`, `verified_size_bytes`, `reserved_bytes`, `sha256_checksum`, `upload_expires_at`, `uploaded_completed_at`, `archived_*`, `retention_until`, and `is_deleted`.
  - `tenant_export_jobs` table and `org:data:export` / `document:archive` permissions did not exist.
- **Dependencies (`package.json`):**
  - Added `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, and `jszip`.
