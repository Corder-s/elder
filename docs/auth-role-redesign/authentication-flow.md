# Authentication Flow — ElderCare OS

## Login Flow (`POST /api/auth/login`, `src/app/login/page.tsx`)
1. User enters email & password (with password visibility toggle, forgot-password link, and email verification notice).
2. Server enforces per-IP and per-account rate limits, validates `bcryptjs` password hash, checks `email_verified_at` and `status === 'active'`, and creates a DB-backed `user_sessions` record + HTTP-only signed JWT cookie.
3. Client calls `refreshSession()` (`GET /api/auth/me` with `Cache-Control: no-store`) and redirects strictly based on server-verified identity:
   - `isPlatformAdmin` -> `/platform/mfa` (if MFA pending) or `/platform/dashboard`
   - No active NGO membership -> `/pending-approval`
   - Active NGO membership -> `/` (renders the server-assigned role workspace)
