# Stage 3B-7 Implementation Report

## Summary
Stage 3B-7 (**Secure Document Vault, Object Storage & Tenant Data Portability**) has been implemented, verified, and integrated on top of Stages 3B-2 through 3B-6.

## Deliverables Completed
1. **Additive Migration (`migrations/012_document_vault_and_tenant_exports.sql`, rollback `migrations/012_document_vault_and_tenant_exports_rollback.sql`):**
   - Extended `documents` with `branch_id`, `document_status`, `scan_status`, `declared_size_bytes`, `verified_size_bytes`, `reserved_bytes`, `sha256_checksum`, `upload_expires_at`, `uploaded_completed_at`, `archived_*`, `retention_until`, and `is_deleted`.
   - Created `tenant_export_jobs` with `FORCE ROW LEVEL SECURITY` and `tenant_isolation_policy`.
   - Seeded `org:data:export` and `document:archive` permissions and assigned them to NGO `admin` roles.
2. **Object Storage, Validation & Quota Reservation (`src/lib/storage/*`, `src/lib/billing/quota-service.ts`):**
   - `s3-client.ts`, `validation.ts` (allowlist, magic bytes, SHA-256, malware scan adapter), `document-auth.ts`, `retention-cleanup.ts`.
3. **Document & Export APIs:**
   - `POST /api/documents/upload-intents`, `POST /api/documents/[id]/complete-upload`, `GET /api/documents/[id]/download-url`, `GET`/`PATCH /api/documents/[id]`, updated `GET`/`POST /api/documents`.
   - `GET`/`POST /api/exports`, `GET /api/exports/[id]/download-url`.
4. **Async Export Worker (`scripts/run-export-worker.js`, `src/lib/export/tenant-export-service.ts`):**
   - `FOR UPDATE SKIP LOCKED` job claiming, retry handling, JSON/CSV + document ZIP packaging, SHA-256 checksums, 72-hour expiration, and abandoned upload cleanup.
5. **UI Consoles:**
   - Connected [documents/page.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/app/documents/page.tsx) to real Vault APIs (removed `mockDataService` fixtures).
   - Added [settings/exports/page.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/app/settings/exports/page.tsx) linked from [settings/page.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/app/settings/page.tsx).
   - Fixed the Stage 3B-6 ESLint `useEffect` warning in `src/app/platform/subscriptions/page.tsx`.

**Status:** READY FOR STAGE 3B-8
