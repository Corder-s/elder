# ElderCare OS — Stage 3B-5: RBAC Permission Matrix

**Document ID:** ECO-DOC-S3B5-RBAC-001  
**Date:** November 28, 2026  

---

All endpoints use `requireTenantPermission()` from [`src/lib/rbac.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/rbac.ts) backed by `verifyServerSession()` and live PostgreSQL `role_permissions`.

| Module / Action | Required Permission(s) |
|---|---|
| Rescue List / Detail / Create / Update / Convert | `rescue:read`, `rescue:create`, `rescue:update`, `rescue:convert` (+ `resident:create`) |
| Prescriptions & Schedules Read / Create / Administer | `medical:prescription:read` (or `family:resident:view_own`), `medical:prescription:create`, `medical:schedule:administer` |
| Facilities & Bed Assignment Read / Manage | `facility:read`, `facility:manage` |
| Visitors Read / Check-In & Check-Out | `visitor:read`, `visitor:log` |
| Staff Directory / Invite / Update / Deactivate | `org:member:read`, `org:member:invite`, `org:member:update`, `org:member:deactivate` |
| Events Read / Manage | `event:read`, `event:manage` |
| Daily Diary Read / Create / Update | `diary:read`, `diary:create`, `diary:update` |
| Tasks Read / Create / Update / Assign | `task:read`, `task:create`, `task:update`, `task:assign` |
| Expenses Read / Create / Approve | `finance:expense:read`, `finance:expense:create`, `finance:expense:approve` |
| Reports & Analytics | `report:read` or `finance:report:generate` |
| Workspace Settings Read / Update | `org:settings:read`, `org:settings:update` |
