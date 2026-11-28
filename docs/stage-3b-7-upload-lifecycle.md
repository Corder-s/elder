# Stage 3B-7 Upload & Download Lifecycle

## Upload Flow
1. `POST /api/documents/upload-intents`:
   - Rejects forged `s3Key`, `objectKey`, or `organizationId` in request body.
   - Validates extension, MIME type, and size limit.
   - Verifies resident/rescue-case ownership and branch scoping.
   - Enforces storage quota inside `withTenantContext` (`FOR UPDATE OF ts`), reserving `declared_size_bytes` in `reserved_bytes` with a 5-minute `upload_expires_at`.
   - Returns short-lived presigned `PUT` URL (300s) and sanitized document metadata (`pending_upload`).
2. Browser uploads file bytes directly to private S3 via presigned `PUT` URL.
3. `POST /api/documents/[id]/complete-upload`:
   - Idempotent if already completed (`alreadyCompleted: true`).
   - Rejects expired intents (`410 Gone`) and releases `reserved_bytes`.
   - Verifies S3 object existence (`HeadObject`), actual byte size, magic-byte signature, and SHA-256 checksum.
   - Evaluates malware scan adapter, transitions state (`available` or `pending_scan`), clears `reserved_bytes`, and reconciles `usage_records.storage_bytes`.

## Download Flow
- `GET /api/documents/[id]/download-url`:
  - Re-verifies full authorization (org, branch, family link, confidentiality) and `document_status === 'available'`.
  - Audits `document_download_authorized` (or `document_download_denied`).
  - Returns a 3-minute (180s) presigned `GET` URL with `Content-Disposition: attachment`.
