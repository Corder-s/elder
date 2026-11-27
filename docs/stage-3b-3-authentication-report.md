# ElderCare OS — Stage 3B-3: Authentication & Account Security Report

**Document ID:** ECO-DOC-S3B3-AUTH-001  
**Date:** November 27, 2026  
**Scope:** Email Verification, Password Recovery, Login Protection & Rate Limiting  

---

## 1. Email Verification Architecture

- **Registration Flow ([`src/app/api/auth/register/route.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/app/api/auth/register/route.ts)):**
  - Enforces password complexity (`validatePasswordStrength`: >= 8 chars, uppercase, lowercase, digit, special character) and hashes with `bcryptjs` (`cost = 12`).
  - Inserts user with `email_verified_at = NULL`.
  - Generates a 32-byte cryptographically random token (`crypto.randomBytes(32).toString('hex')`), stores only its SHA-256 hash (`hashToken`) in `user_verification_tokens` (`token_type = 'email_verification'`, 24-hour expiration).
  - Dispatches verification link via [`src/lib/email.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/email.ts) (`SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` via environment variables).
- **Verification Endpoint (`POST /api/auth/verify-email`):**
  - Atomically claims token with `UPDATE user_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = $1 AND token_type = 'email_verification' AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP RETURNING user_id`.
  - Prevents replay and race conditions; updates `users.email_verified_at` only upon valid token claim.
- **Resend Endpoint (`POST /api/auth/resend-verification`):**
  - Rate-limited per IP (10/15m) and per account (3/15m).
  - Invalidates prior unused verification tokens and returns a generic response to prevent account enumeration.

---

## 2. Password Recovery Architecture

- **Forgot Password (`POST /api/auth/forgot-password`):**
  - Rate-limited per IP (10/15m) and per account (3/15m).
  - Always returns an identical generic HTTP 200 message regardless of whether the email exists.
  - Invalidates prior unused `password_reset` tokens, stores a 30-minute SHA-256 token hash, and sends a reset link (never sends passwords).
- **Reset Password (`POST /api/auth/reset-password`):**
  - Validates new password strength and atomically claims the single-use `password_reset` token.
  - Updates `users.password_hash`, sets `password_changed_at = CURRENT_TIMESTAMP`, clears `failed_login_attempts` / `locked_until`, revokes **all** active sessions in `user_sessions`, and dispatches a security alert email.

---

## 3. Login Protection & Rate Limiting

- **Database-Backed Rate Limiter ([`src/lib/security.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/security.ts)):**
  - `auth_rate_limits` tracks sliding 15-minute buckets for `login:ip:<ip>` (max 20) and `login:acct:<email>` (max 5).
  - Progressive temporary lockouts (`5–15 minutes`, `users.locked_until`) prevent brute-force attacks without enabling permanent denial-of-service account lockouts.
  - Generic `'Invalid email or password'` response prevents account enumeration.
  - Immutable security events (`login_success`, `login_failure`, `login_locked`, `rate_limited`, `email_verified`, `password_reset_requested`, `password_reset_completed`) are written to `auth_security_events`.
