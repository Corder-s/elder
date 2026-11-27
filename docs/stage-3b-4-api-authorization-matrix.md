# ElderCare OS — Stage 3B-4: API Authorization Matrix

**Document ID:** ECO-DOC-S3B4-MATRIX-001  
**Date:** November 27, 2026  

---

| Endpoint | Method | Required Permission(s) | Additional Restrictions |
|---|---|---|---|
| `/api/residents` | `GET` | `resident:read` or `family:resident:view_own` | Family scoped to `resident_family_links`; non-admin branch-scoped |
| `/api/residents` | `POST` | `resident:create` | Quota & suspended-plan check inside `withTenantContext`; no Platform Admin bypass |
| `/api/admissions` | `GET` | `resident:read` or `family:resident:view_own` | Family scoped to `resident_family_links`; non-admin branch-scoped |
| `/api/medical/records` | `GET` | `medical:record:read` or `family:resident:view_own` | **Platform Owners strictly blocked (`403`)**; family requires `can_view_records = true` + blocks IDOR `residentId` |
| `/api/medical/records` | `POST` | `medical:record:write` | **Platform Owners strictly blocked (`403`)**; clinician roles only |
| `/api/finance/donations` | `GET` | `finance:donation:read` | Restricted to finance/admin/auditor roles |
| `/api/finance/donations` | `POST` | `finance:donation:create` | Restricted to `accountant` / `admin` with permission |
| `/api/documents` | `GET` | `document:read` or `family:resident:view_own` | Confidential docs restricted to `admin`/`doctor`/`accountant`/uploader; family scoped + IDOR blocked |
| `/api/documents` | `POST` | `document:upload` | Enforced via `requireTenantPermission` |
| `/api/attendance` | `GET` | `attendance:read` or `family:resident:view_own` | Family scoped; non-admin branch-scoped |
| `/api/attendance` | `POST` | `attendance:mark` | Enforced via `requireTenantPermission` |
| `/api/subscription/usage` | `GET` | `org:subscription:read` | Staff & storage counts run inside `withTenantContext` |
| `/api/platform/*` | `GET`/`PATCH` | `isPlatformAdmin && mfaVerified` | Verified via `verifyServerSession` + `queryPlatform` |
