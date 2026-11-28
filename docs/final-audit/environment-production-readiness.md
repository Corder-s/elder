# Environment & Production Readiness — ElderCare OS

## Current `.env` Configuration Status
- **Database:** `DATABASE_URL` configured for `eldercare_app` (`NOSUPERUSER`, `NOBYPASSRLS`). Production `eldercareos` holds migrations `001`–`007`; sandbox `eldercareos_restore_test` holds `001`–`013`.
- **Auth & MFA:** `JWT_SECRET` and `MFA_ENCRYPTION_KEY` configured.
- **Object Storage:** `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` are blank (tested via in-process S3 mock).
- **Malware Scanner:** `MALWARE_SCANNER_ENDPOINT` is unset (production uploads remain in `pending_scan`).
- **OCR / AI:** `tesseract` CLI is not installed on host; `OCR_PROVIDER_ENDPOINT` is unset (text PDFs supported natively; image scans route to `needs_review`).
- **Billing:** Razorpay uses `rzp_test_placeholder` keys (test mode enforced).
- **Email:** `SMTP_HOST` is blank (email dispatch is best-effort).
- **Observability:** No `/api/health` endpoint, no centralized APM/alerting, and no scheduled worker daemon/cron configured.
