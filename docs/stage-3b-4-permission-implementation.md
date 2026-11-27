# ElderCare OS — Stage 3B-4: Permission Implementation Report

**Document ID:** ECO-DOC-S3B4-PERM-001  
**Date:** November 27, 2026  

---

## 1. Centralized RBAC Engine ([`src/lib/rbac.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/rbac.ts))

- **`requireTenantPermission(req, requiredPermissions)`:**
  1. Calls `verifyServerSession(req)`, which validates the database `user_sessions` record (`is_revoked = false`, `expires_at > NOW()`), `users.status === 'active'`, `password_changed_at`, and dynamically loads the user's current `roleSlug`, `branchId`, and `permissions` from `organization_memberships` + `role_permissions` in PostgreSQL.
  2. Rejects requests with no `activeOrgId` or `roleSlug` (`403 Forbidden`).
  3. Checks `session.permissions` against `requiredPermissions` with **no** `isPlatformAdmin` bypass.
  4. Logs every `403` denial as an immutable `authz_denied` event in `auth_security_events`.
- **`requirePlatformOwner(req)`:**
  - Enforces `session.isPlatformAdmin === true` AND `session.mfaVerified === true`.
- **`getFamilyResidentLinks(organizationId, userId)`:**
  - Resolves `resident_family_links` inside `withTenantContext(organizationId, ...)` for `family_member` / `family_guardian` scoping.
