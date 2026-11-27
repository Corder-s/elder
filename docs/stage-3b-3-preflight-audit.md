# ElderCare OS — Stage 3B-3: Authentication & Account Security Preflight Audit

**Document ID:** ECO-DOC-S3B3-PREFLIGHT-001  
**Audit Date:** November 27, 2026  
**Auditor:** Principal Authentication Architect & Application Security Engineer  
**Branch:** `main` (Baseline: Stage 3B-2)  

---

## 1. Executive Summary

This preflight audit inspects the existing authentication, session, database context, and UI implementation prior to implementing **Stage 3B-3: Authentication and Account Security**.

While Stage 3B-2 hardened PostgreSQL Row-Level Security (RLS), composite foreign keys, and audit log immutability, the application-layer authentication and session subsystem remains **partially mocked and stateless**, with several critical repository hygiene and authorization gaps that must be corrected before adding new auth flows.

---

## 2. Inventory of Existing Implementation

| File / Component | Current Role | Status | Identified Gaps |
|---|---|---|---|
| [`src/lib/auth.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/auth.ts) | bcrypt hashing (`cost=12`), JWT minting, `getUserMemberships`, `buildSessionPayload` | Partial | No server-side session creation/revocation; `buildSessionPayload` does not reject `suspended`/`deactivated` users or `suspended` organizations; no password strength validator. |
| [`src/lib/jwt.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/jwt.ts) | `jose` HS256 JWT sign/verify | Weak | Hardcoded fallback JWT secret string when `process.env.JWT_SECRET` is unset; no `jti` / `sessionId` claim; no `mfaVerified` claim. |
| [`src/lib/db.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/db.ts) | `getDbPool`, `withTenantContext`, `queryTenant`, `withPlatformContext`, `queryPlatform` | Needs Guarding | `queryPlatform()` and `withPlatformContext()` lack any caller authorization check; `withTenantContext()` does not verify user membership before setting `app.current_organization_id`. |
| [`src/middleware.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/middleware.ts) | Edge JWT verification & header injection | Weak | Line 32 `pathname.startsWith('/api/auth/')` bypasses middleware auth for **all** `/api/auth/*` routes (including `/me`, `/switch-workspace`, and future session/MFA endpoints). Does not check `mfaVerified` on `/platform/*`. |
| `src/app/api/auth/login/route.ts` | Password login & cookie issuance | Partial | No rate limiting (per-IP/per-account), no brute-force lockout, no DB session record in `user_sessions`, no MFA gate for Platform Admins, no audit logging, no email-verification check. |
| `src/app/api/auth/register/route.ts` | User registration | Partial | Auto-sets `email_verified_at = CURRENT_TIMESTAMP` without verifying email; no password strength policy; no DB session record. |
| `src/app/api/auth/logout/route.ts` | Clears `eldercare_session` cookie | Partial | Does not revoke the session in `user_sessions`. |
| `src/app/api/auth/me/route.ts` | Returns JWT session & memberships | Partial | Relies solely on stateless JWT; does not check `user_sessions.is_revoked` or `users.status`. |
| `src/app/api/auth/switch-workspace/route.ts` | Re-mints JWT for target org | Partial | Does not validate active DB session, user suspension, or org suspension; does not update `user_sessions.active_organization_id`. |
| `user_sessions` table (`001_identity_tenancy.sql`) | Stores `session_token`, `user_agent`, `ip_address`, `expires_at`, `is_revoked` | Unused | Never written to or queried by any API route. |
| `user_verification_tokens` table (`008_security_hardening.sql`) | Stores `token_type`, `token_hash`, `expires_at`, `used_at` | Unused | Table staged in Migration 008; no API routes exist yet. |
| `src/context/AuthContext.tsx` | Client auth state | Mock Fallback | Defaults to `DEV_INITIAL_USER`; `login()` falls back to simulated login if password omitted; `switchRole()` allows client-side role spoofing. |
| `src/app/login/page.tsx` | Login screen | Mocked | Uses `setTimeout` + simulated role selector instead of real `/api/auth/login` credential submission. |
| `src/app/platform/login/page.tsx` | Platform Admin login | Credential Leak | Hardcodes `ElderCare@Admin2026!` as default React state for password input. |
| `src/app/forgot-password/page.tsx` | Forgot password UI | Mocked | Uses `setTimeout` instead of `POST /api/auth/forgot-password`. |
| `src/app/reset-password/page.tsx` | Reset password UI | Mocked | Uses `setTimeout` instead of `POST /api/auth/reset-password`. |
| `src/app/email-verification/page.tsx` | Email verification UI | Mocked | Uses `setTimeout` instead of `POST /api/auth/verify-email` and `POST /api/auth/resend-verification`. |

---

## 3. Critical Repository Corrections Required (Section 2 A–E)

### A. Hardcoded Database Credentials & Secrets
- **`migrations/007_app_role.sql`:** Contains literal password `'eldercare_app_secure_pass_2026'`. Must be parameterized or documented as a local template without hardcoded production credentials in scripts/tests.
- **`scripts/test-stage3b2-hardening.js` & `tests/stage-3b-2-database-security.test.js`:** Hardcode `'eldercare_app_secure_pass_2026'`. Must read from `process.env.APP_DATABASE_URL` / `process.env.DATABASE_URL` or `process.env.APP_DB_PASSWORD`.
- **`scripts/seed-platform-admin.js`:** Hardcodes `'ElderCare@Admin2026!'`. Must read `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` from environment variables (or fail with instructions if not provided).
- **`src/lib/jwt.ts`:** Hardcodes `'eldercare_saas_production_jwt_secret_key_2026_super_secure_32chars'` as a fallback. Must require `process.env.JWT_SECRET` (with a strict error in production, or explicit runtime check).
- **`src/app/platform/login/page.tsx`:** Hardcodes `'ElderCare@Admin2026!'` in `useState(...)`. Must initialize to empty string `""`.

### B. Authorization Guarding for `queryPlatform()` and `withPlatformContext()`
- In `src/lib/db.ts`, `queryPlatform()` and `withPlatformContext()` currently execute arbitrary SQL on global tables without verifying that the caller is an authorized Platform Admin or authorized internal auth service.
- **Fix:** Add `withAuthorizedPlatformContext(session, operation)` and `queryAuthorizedPlatform(session, text, params)` that strictly assert `session?.isPlatformAdmin === true` and `session?.mfaVerified === true` (and verify active session/user status), and mark internal auth-only queries explicitly so ordinary tenant handlers cannot call platform-global queries.

### C. Migration 008 Rollback Safety
- `migrations/008_security_hardening_rollback.sql` currently executes:
  ```sql
  DROP TABLE IF EXISTS resident_family_links CASCADE;
  DROP TABLE IF EXISTS user_verification_tokens CASCADE;
  ```
- **Risk:** Routine rollback would permanently destroy verification tokens and family-to-resident authorization links.
- **Fix:** Remove destructive `DROP TABLE ... CASCADE` from `008_security_hardening_rollback.sql` (preserve those tables and their data, rolling back only constraints/triggers if needed).

### D. `scripts/verify-backup-restore.js` Safety & Error Handling
- Line 87 runs `DROP DATABASE IF EXISTS eldercareos_restore_test WITH (FORCE);` unconditionally.
- Lines 99–104 catch `execSync(restoreCmd)` errors with `console.warn(...)`, allowing a failed `psql` restore to proceed and appear successful.
- **Fix:**
  1. Refuse to run against `eldercareos` or any existing database unless it is a newly created uniquely named isolated test DB (never overwrite an existing database).
  2. Run `psql` with `-v ON_ERROR_STOP=1` and rethrow/abort immediately if `execSync` fails or stderr contains errors.

### E. Tenant Authorization Before Setting `app.current_organization_id`
- `withTenantContext(organizationId, operation)` validates UUID format, which prevents SQL injection, but does not verify that the requesting user holds an active membership in `organizationId`.
- **Fix:** Add `withAuthorizedTenantContext(session, organizationId, operation)` in `src/lib/db.ts` / `src/lib/auth.ts` that verifies:
  1. Session is valid and not revoked in `user_sessions`.
  2. User status is `active`.
  3. User holds an `active` membership in `organizationId` (or is an MFA-verified Platform Admin with explicit target org scope).

---

## 4. Missing Stage 3B-3 Functionality Summary

1. **Additive Migration (`migrations/009_auth_security_mfa.sql`):**
   - Add `session_id` / `token_family` / `revoked_at` / `revoked_reason` / `mfa_verified` metadata to `user_sessions`.
   - Add `login_attempts` / `rate_limit_buckets` table for DB-backed rate limiting and brute-force protection.
   - Add `platform_mfa_secrets` and `platform_mfa_recovery_codes` tables (or `users` MFA fields + dedicated recovery codes table with hashed codes).
   - Add `security_events` / `auth_audit_logs` or route security events into `platform_audit_logs` / `tenant_audit_logs` + `auth_security_events`.
   - Add indexes for token/session/rate-limit lookups and expired token cleanup helper.
2. **Email Provider Integration (`src/lib/email.ts`):**
   - Environment-configured SMTP / HTTP email provider (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, with safe structured dev-sink fallback when `NODE_ENV !== 'production'` and SMTP is not configured—never logging plaintext passwords or secrets).
3. **Auth Endpoints:**
   - `POST /api/auth/verify-email` & `POST /api/auth/resend-verification`
   - `POST /api/auth/forgot-password` & `POST /api/auth/reset-password`
   - `GET /api/auth/sessions`, `DELETE /api/auth/sessions/[id]`, `POST /api/auth/revoke-all-sessions`
   - `POST /api/auth/mfa/enroll`, `POST /api/auth/mfa/verify`, `POST /api/auth/mfa/recovery-codes`, `POST /api/auth/mfa/reset`
   - Harden `login`, `register`, `logout`, `me`, `switch-workspace`.
4. **Frontend Integration:**
   - Wire `login`, `platform/login`, `forgot-password`, `reset-password`, `email-verification`, `settings` (active sessions & logout all devices), and Platform Owner MFA enrollment/verification/recovery UI while preserving the exact `#FAF8FF` / `#6D28D9` ElderCare OS design system.
