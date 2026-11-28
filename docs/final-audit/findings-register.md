# Findings Register — ElderCare OS Final Readiness Audit

## CRITICAL
- None observed.

## HIGH
1. **`AUD-HIGH-01` — Production Malware Scanner Not Configured**
   - **Affected:** `src/lib/storage/validation.ts`, `.env`
   - **Evidence:** `MALWARE_SCANNER_ENDPOINT` is unset. In `NODE_ENV=production` without `ALLOW_DEV_SCAN_BYPASS=true`, uploaded documents remain quarantined in `pending_scan` (`GET /api/documents/[id]/download-url` returns `409`).
   - **Impact:** NGOs cannot download newly uploaded files in production until a real scanner is integrated.
   - **Correction:** Integrate ClamAV/cloud AV service at `MALWARE_SCANNER_ENDPOINT` before production launch.

2. **`AUD-HIGH-02` — Stale Preflight Backup & Production Schema Behind Sandbox**
   - **Affected:** `backups/eldercareos_phase3b_preflight_backup.sql`, `scripts/verify-backup-restore.js`, `eldercareos`
   - **Evidence:** `node scripts/check-migrations.js` shows only `001`–`007` on `eldercareos` (while `008`–`013` are verified on `eldercareos_restore_test`), and `node scripts/verify-backup-restore.js` exited with code 1 (`platform_audit_logs`: `Source=6` vs `Restored=4`).
   - **Impact:** Preflight backup cannot restore current production state or Stage 3B-3..3B-8 tables.
   - **Correction:** Take a fresh backup before applying `008`–`013` in a controlled staging/production maintenance window, and automate daily backups + restore drills.

3. **`AUD-HIGH-03` — External Production Services Unconfigured (S3, SMTP, Live Razorpay, Image OCR)**
   - **Affected:** `.env`, `src/lib/storage/s3-client.ts`, `src/lib/email.ts`, `src/lib/billing/payment-provider.ts`, `src/lib/document-intelligence/providers/ocr-provider.ts`
   - **Evidence:** `.env` has blank `S3_*` credentials, blank `SMTP_HOST`, `rzp_test_placeholder` Razorpay keys, and no `tesseract` binary / `OCR_PROVIDER_ENDPOINT`.
   - **Impact:** Live file storage, email notifications, real payments, and scanned-image OCR cannot operate until provisioned.
   - **Correction:** Provision private S3/R2 bucket, SMTP relay, Razorpay live keys (only at go-live), and Tesseract/external OCR endpoint.

## MEDIUM
4. **`AUD-MED-01` — Missing Health Check Endpoint (`/api/health`)**
   - **Affected:** `src/app/api/`
   - **Evidence:** Directory listing shows 68 route files and no `/api/health/route.ts`.
   - **Impact:** Load balancers and uptime monitors lack a DB/storage/worker readiness probe.
   - **Correction:** Add `GET /api/health` verifying `SELECT 1` on PostgreSQL and configuration status (without exposing secrets).

5. **`AUD-MED-02` — Database-Bound Rate Limiting**
   - **Affected:** `src/lib/security.ts`
   - **Evidence:** `checkRateLimit` uses PostgreSQL `rate_limit_buckets`.
   - **Impact:** High-volume credential-stuffing or DDoS traffic hits PostgreSQL before being throttled.
   - **Correction:** Place a WAF/CDN rate limiter in front of `/api/auth/*` and `/api/webhooks/*` in production.

6. **`AUD-MED-03` — Unbounded List Queries on 8 Operational GET Endpoints**
   - **Affected:** `src/app/api/{residents,admissions,attendance,staff,visitors,medical/records,finance/donations,finance/expenses}/route.ts`
   - **Evidence:** `GET` queries omit `LIMIT`/`OFFSET` pagination.
   - **Impact:** Large tenant datasets could cause slow responses or high memory usage.
   - **Correction:** Add standard `limit` (default 50, max 100) and `offset` pagination.

7. **`AUD-MED-04` — Missing Automatic Stale-Lock Recovery in Document Intelligence Worker**
   - **Affected:** `scripts/run-doc-intelligence-worker.js`, `src/lib/document-intelligence/processing-pipeline.ts`
   - **Evidence:** `timeout_at` is written when claiming a job, but no query resets `status = 'processing' AND timeout_at < CURRENT_TIMESTAMP` back to `'queued'`.
   - **Impact:** A worker crash mid-job leaves that job stuck in `processing` until manually reset.
   - **Correction:** Add a stale-lock recovery query at the start of each worker cycle.

## LOW
8. **`AUD-LOW-01` — Residual Unused Files**
   - **Affected:** `src/services/fixtures.ts`, `src/services/mockDataService.ts`, `scripts/run-export-worker.ts`
   - **Evidence:** Files remain in repo though unused by production UI pages.
   - **Correction:** Archive or remove unused stub/fixture files after final staging sign-off.

9. **`AUD-LOW-02` — Standard `<img>` Tag in Document Preview**
   - **Affected:** `src/app/documents/page.tsx`
   - **Evidence:** Uses `<img>` for dynamic presigned S3 URLs.
   - **Correction:** Acceptable for dynamic external presigned URLs; no immediate action required.
