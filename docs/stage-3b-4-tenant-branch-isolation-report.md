# ElderCare OS — Stage 3B-4: Tenant, Branch & Family Isolation Report

**Document ID:** ECO-DOC-S3B4-ISOLATION-001  
**Date:** November 27, 2026  

---

## 1. Multi-Layer Tenant & Branch Isolation

1. **PostgreSQL RLS Layer:** Every tenant-scoped table (`residents`, `admissions`, `medical_records`, `documents`, `donations`, `attendance`, `resident_family_links`, `organization_memberships`) has `FORCE ROW LEVEL SECURITY` enabled and is queried inside `withTenantContext(session.activeOrgId, ...)`.
2. **Quota & Usage Queries Fixed:** Fixed `POST /api/residents` and `GET /api/subscription/usage` so resident, staff, and storage queries run inside `withTenantContext(orgId, ...)` instead of bypassing RLS context via `pool.query()`.
3. **Branch Scoping:** When a non-`admin` user has `organization_memberships.branch_id` assigned, `GET /api/residents`, `GET /api/admissions`, `GET /api/medical/records`, and `GET /api/attendance` scope results to `(branch_id = $branchId OR branch_id IS NULL)`.
4. **Family-Member Scoping (`resident_family_links`):**
   - `family_member` / `family_guardian` users are strictly restricted to residents linked in `resident_family_links` for their `user_id`.
   - Medical record access additionally requires `can_view_records = true`.
   - Direct `?residentId=` queries for unlinked residents return `403 Forbidden` (IDOR blocked).
5. **Platform Owner Medical Exclusion:** `GET/POST /api/medical/records` explicitly returns `403 Forbidden` when `session.isPlatformAdmin === true`, even if the Platform Owner also holds an NGO membership.
