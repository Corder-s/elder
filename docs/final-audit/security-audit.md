# Security Audit — ElderCare OS

## Verified Controls
- **Middleware (`src/middleware.ts`):** Fail-closed protection for `/platform/*` and `/api/*` routes; only explicit `PUBLIC_ROUTES` (including `/api/webhooks/razorpay`, which enforces raw-body HMAC-SHA256) bypass session verification.
- **Session & Password Security:** `bcryptjs` password hashing, HTTP-only signed JWTs (`jose`), DB-backed session revocation (`user_sessions`), brute-force rate limiting (`src/lib/security.ts`), and Platform Owner TOTP MFA + single-use recovery codes.
- **Payment & Webhook Security:** Razorpay test-mode guardrail rejects `rzp_live_` keys; checkout and webhook signatures verified with `crypto.timingSafeEqual`; `payment_webhook_events` deduplicates events atomically.
- **Document & AI Security:** Server-generated S3 keys, magic-byte validation, SHA-256 verification, short-lived presigned URLs (180s–300s), prompt-injection detection (`validation-engine.ts`), and strict Platform Owner exclusion from clinical/document/export APIs (`403`).

## Security Gaps Identified
- **HIGH — Production Malware Scanner Not Configured (`AUD-HIGH-01`):** `MALWARE_SCANNER_ENDPOINT` is unset in `.env`. While the code safely quarantines unscanned production uploads in `pending_scan`, live deployments require a real malware scanning service before uploaded files can become `available` without manual/dev bypass.
- **MEDIUM — In-Process / DB-Bound Rate Limiting Scope (`AUD-MED-02`):** Rate limiting uses PostgreSQL `rate_limit_buckets`; while functional for single-cluster deployments, high-volume DDoS/edge throttling should be fronted by a WAF/CDN in production.
