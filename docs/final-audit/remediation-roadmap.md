# Remediation Roadmap — ElderCare OS

## Phase 1: Before Staging Validation (Code & Ops Quick Wins)
1. Add `GET /api/health` endpoint checking PostgreSQL connectivity (`AUD-MED-01`).
2. Add stale-lock recovery (`status = 'processing' AND timeout_at < CURRENT_TIMESTAMP`) to `scripts/run-doc-intelligence-worker.js` and `processing-pipeline.ts` (`AUD-MED-04`).
3. Add `LIMIT`/`OFFSET` pagination to the 8 unbounded operational `GET` routes (`AUD-MED-03`).
4. Remove or archive unused `src/services/fixtures.ts`, `src/services/mockDataService.ts`, and `scripts/run-export-worker.ts` (`AUD-LOW-01`).

## Phase 2: Staging Infrastructure Provisioning
1. Provision private S3/R2 bucket with strict CORS and IAM least-privilege keys (`AUD-HIGH-03`).
2. Integrate `MALWARE_SCANNER_ENDPOINT` (ClamAV/cloud AV) so `pending_scan` documents transition to `available` cleanly in production mode (`AUD-HIGH-01`).
3. Install `tesseract` (`eng+hin`) or configure `OCR_PROVIDER_ENDPOINT` with DPA review for scanned-image OCR (`AUD-HIGH-03`).
4. Configure SMTP relay (`SMTP_HOST`) and Razorpay test/live keys (`AUD-HIGH-03`).

## Phase 3: Database Migration & Backup Cutover
1. Take a fresh `pg_dump` backup of `eldercareos`, apply migrations `008`–`013` in staging, and run `verify-backup-restore.js` to confirm 100% table/row parity (`AUD-HIGH-02`).
2. Set up automated daily encrypted backups, PITR, worker process supervision (systemd/PM2), and WAF rate limiting (`AUD-MED-02`).
