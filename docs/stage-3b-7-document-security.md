# Stage 3B-7 Document Security & Validation

## Authorization (`src/lib/storage/document-auth.ts`)
Every read, download-URL request, completion, and archive operation enforces:
1. Authenticated session (`verifyServerSession`) + active NGO membership (`requireTenantPermission`).
2. PostgreSQL Row-Level Security (`withTenantContext(orgId, ...)`).
3. Branch scoping for non-admin staff (`doc.branch_id === session.branchId`).
4. Family-member scoping (`resident_family_links`): only documents linked to their assigned resident(s), never confidential documents.
5. Confidentiality restrictions: `is_confidential = true` restricted to `admin`, `doctor`, `accountant`, or original uploader.
6. Platform Owner isolation: Platform Owners receive `403` on `/api/documents*` and `/api/exports*`.

## Content Validation & Malware Scanning (`src/lib/storage/validation.ts`)
- **Allowlist:** `application/pdf` (`.pdf`), `image/jpeg` (`.jpg`, `.jpeg`), `image/png` (`.png`), `image/webp` (`.webp`).
- **Max Size:** Configurable via `DOCUMENT_MAX_SIZE_BYTES` (default 10 MB).
- **Magic-Byte Signature Verification:** Verifies actual uploaded bytes (`%PDF-`, `FF D8 FF`, PNG header, `RIFF....WEBP`) during `POST /api/documents/[id]/complete-upload`. Mismatches delete the S3 object, mark `document_status = 'rejected'`, and release reserved quota.
- **Malware Scanner Adapter:** Calls `MALWARE_SCANNER_ENDPOINT` if configured; in `production` without a scanner, keeps files quarantined in `pending_scan` (never silently marking them malware-free). In development/test with `ALLOW_DEV_SCAN_BYPASS=true`, transitions to `available` (`scan_status = 'dev_bypass'`).
