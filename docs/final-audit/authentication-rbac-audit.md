# Authentication & RBAC Audit — ElderCare OS

## Authentication Capabilities Verified
- Registration, email verification tokens, login, logout, password reset (`forgot-password`, `reset-password`), session listing & individual/global revocation (`sessions`, `revoke-all-sessions`), workspace switching (`switch-workspace`), and Platform Owner MFA (`mfa/enroll`, `mfa/verify`, `mfa/recovery-codes`, `mfa/reset`).
- Account suspension (`users.status = 'suspended'`) and membership suspension immediately block both new logins and existing active sessions.

## Authorization (RBAC) Verified
- Centralized `requireTenantPermission(req, permissions)` and `requirePlatformOwner(req)` in `src/lib/rbac.ts` query live DB membership and role permissions on every request (no stale JWT permission claims).
- 8 NGO roles (`admin`, `doctor`, `nurse`, `accountant`, `staff`, `volunteer`, `family_member`, `auditor`) + separate Platform Owner identity.
- Stage 3B-7 & 3B-8 granular permissions (`org:data:export`, `document:archive`, `document:process`, `document:extraction:read`, `document:review`, `document:approve`, `form:draft:create`, `form:read`, `form:submit`) enforce clinical boundaries (e.g., `nurse`/`staff` blocked `403` from approving medical extractions).
