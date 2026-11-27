# ElderCare OS — Stage 3B-3: Session Security & Workspace Validation Report

**Document ID:** ECO-DOC-S3B3-SESS-001  
**Date:** November 27, 2026  
**Scope:** Server-Side Sessions, Revocation, Suspension Enforcement & Tenant Context Guards  

---

## 1. Server-Side Session Lifecycle

ElderCare OS no longer relies solely on stateless JWT expiration. Every login mints a persistent row in `user_sessions` and binds the JWT (`jti` / `sessionId`) to that database record ([`src/lib/auth.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/auth.ts)):

1. **Creation (`createServerSession`):** Stores hashed session secret, `user_id`, `active_organization_id`, `ip_address`, `user_agent`, `device_name`, `mfa_verified`, and 7-day `expires_at`.
2. **Validation (`verifyServerSession`):** On every authenticated request (`/api/auth/me`, `/api/auth/switch-workspace`, `/api/auth/sessions*`, `/api/auth/mfa/*`, `/api/platform/*`):
   - Verifies JWT cryptographic signature (`HS256` via `JWT_SECRET`, no hardcoded fallback).
   - Verifies `user_sessions.is_revoked = false` and `expires_at > CURRENT_TIMESTAMP`.
   - Verifies `users.status === 'active'` (suspended/deactivated users are rejected immediately).
   - Verifies session `created_at` is newer than `users.password_changed_at`.
   - Re-resolves active organization membership, role, and permissions dynamically from PostgreSQL so stale JWT claims cannot survive role or membership changes.

---

## 2. Revocation Endpoints & Controls

| Endpoint | Purpose | Behavior |
|---|---|---|
| `GET /api/auth/sessions` | List active sessions | Returns active, non-revoked sessions with device metadata and `isCurrent` flag. |
| `DELETE /api/auth/sessions/[id]` | Revoke single session | Marks `is_revoked = true`, sets `revoked_at` & `revoked_reason`, clears cookie if current. |
| `POST /api/auth/revoke-all-sessions` | Logout all devices | Revokes all active sessions for `user_id` (with optional `keepCurrent` flag) and logs `sessions_revoked_all`. |
| `POST /api/auth/logout` | Sign out current device | Revokes current `sessionId` in `user_sessions` and clears `eldercare_session` cookie. |

---

## 3. Organization, Membership & Middleware Hardening

- **Non-Superuser Membership Resolution:** Added `get_user_active_memberships(UUID)` (`SECURITY DEFINER`, `SET search_path = public`) in [`migrations/009_auth_security_mfa.sql`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/migrations/009_auth_security_mfa.sql) so `eldercare_app` (`NOBYPASSRLS`) resolves user memberships safely while `organization_memberships` retains `FORCE ROW LEVEL SECURITY`.
- **Workspace Switching (`POST /api/auth/switch-workspace`):** Validates active DB session and active organization membership; rejects unauthorized target organizations with `403`, updates `user_sessions.active_organization_id`, and re-mints JWT.
- **Database Context Guards ([`src/lib/db.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/db.ts)):**
  - `withPlatformContext(session, op)` and `queryPlatform(session, sql, params)` require `session.isPlatformAdmin === true` and `session.mfaVerified === true`.
  - `withAuthorizedTenantContext(session, orgId, op)` verifies active user, active organization, and active membership before setting `app.current_organization_id`.
- **Middleware (`src/middleware.ts`):** Removed wildcard `/api/auth/` bypass; only explicit public auth routes bypass edge session checks.
