# ElderCare OS — Stage 3B-3: Platform Owner MFA Verification Report

**Document ID:** ECO-DOC-S3B3-MFA-001  
**Date:** November 27, 2026  
**Scope:** TOTP Multi-Factor Authentication, Encrypted Secret Storage & Recovery Codes  

---

## 1. MFA Design & Privilege Separation

- **Strict Platform Owner Scope:** MFA enrollment and verification endpoints (`/api/auth/mfa/*`) strictly enforce `session.isPlatformAdmin === true`. Normal NGO users receive `403 Forbidden`.
- **Pre-MFA Session Isolation:** When a Platform Owner logs in with email/password, `user_sessions.mfa_verified` and JWT `mfaVerified` are initialized to `false`.
- **Edge & API Enforcement:**
  - `src/middleware.ts` redirects any `/platform/*` navigation (except `/platform/login` and `/platform/mfa`) to `/platform/mfa` when `mfaVerified === false`.
  - `/api/platform/metrics` and `/api/platform/organizations` verify `session.isPlatformAdmin && session.mfaVerified` via `verifyServerSession()` and `queryPlatform()` / `withPlatformContext()`.

---

## 2. Cryptographic & Storage Controls ([`src/lib/mfa.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/mfa.ts))

- **TOTP Algorithm:** RFC 6238 HMAC-SHA1, 6 digits, 30-second period, ±1 step verification tolerance, constant-time comparison (`crypto.timingSafeEqual`).
- **Encryption at Rest:** Base32 TOTP secrets are encrypted with **AES-256-GCM** using a unique 12-byte IV and authentication tag (`user_mfa_secrets.secret_encrypted`, `iv`, `auth_tag`).
- **QR Code Enrollment:** `POST /api/auth/mfa/enroll` generates a PNG QR Data URL (`qrcode.toDataURL`) for authenticator apps.
- **Recovery Codes:** Upon initial TOTP verification, 8 single-use `XXXX-XXXX` recovery codes are generated; only SHA-256 hashes are persisted in `user_mfa_recovery_codes`.
- **Single-Use & Reset:** Consuming a recovery code atomically sets `used_at = CURRENT_TIMESTAMP`. `POST /api/auth/mfa/reset` requires current password + unused recovery code and revokes all active sessions.
