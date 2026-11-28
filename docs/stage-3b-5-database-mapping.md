# ElderCare OS — Stage 3B-5: Database Mapping & Migration 010

**Document ID:** ECO-DOC-S3B5-DBMAP-001  
**Date:** November 28, 2026  

---

## 1. Module-to-Table Mapping

| Module | Primary PostgreSQL Tables (All RLS-Enforced) |
|---|---|
| 1. Rescue Cases | `rescue_cases`, `residents`, `admissions`, `usage_records` |
| 2. Medicines & Schedules | `prescriptions`, `medication_schedules`, `medical_observations`, `residents` |
| 3. Facilities, Rooms & Beds | `rooms`, `beds`, `residents`, `branches` |
| 4. Visitors & Visit Logs | `visitors`, `visits`, `residents` |
| 5. Staff & Volunteers | `users`, `organization_memberships`, `roles`, `permissions`, `role_permissions`, `invitations`, `branches` |
| 6. Events & Calendar | `events`, `branches` |
| 7. Daily Diary | `daily_diary`, `users`, `organization_memberships` |
| 8. Tasks & Reminders | `tasks`, `organization_memberships`, `users` |
| 9. Expenses | `expenses`, `users` |
| 10. Reports & Analytics | Server-side SQL aggregates across `residents`, `rescue_cases`, `rooms`, `beds`, `visits`, `organization_memberships`, `medication_schedules`, `attendance`, `donations`, `expenses` |
| 11. Workspace Settings | `organizations`, `branches`, `tenant_subscriptions`, `subscription_plans` |

## 2. Additive Migration (`migrations/010_operational_rbac_and_indexes.sql`)

- Seeded 9 granular permissions (`event:read`, `event:manage`, `task:read`, `task:create`, `task:update`, `task:assign`, `diary:update`, `finance:expense:approve`, `report:read`) and assigned them to existing & future (`provision_new_ngo_workspace`) roles.
- Added non-destructive columns (`events.status`, `events.branch_id`, `events.created_by`, `daily_diary.branch_id`, `tasks.branch_id`, `expenses.status`, `expenses.created_by`).
- Added `uq_beds_active_resident` partial unique index and 9 composite operational indexes.
- Verified cleanly on `eldercareos_restore_test` (Exit Code 0). Production `eldercareos` remains untouched pending approval.
