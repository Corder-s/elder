# ElderCare OS — Stage 3B-5: Performance & Indexing Report

**Document ID:** ECO-DOC-S3B5-PERF-001  
**Date:** November 28, 2026  

---

## 1. Database Indexing & Query Optimization

- Added 9 composite tenant-scoped indexes in [`migrations/010_operational_rbac_and_indexes.sql`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/migrations/010_operational_rbac_and_indexes.sql):
  - `idx_rescue_org_status`, `idx_prescriptions_org_res`, `idx_med_sched_org_status`, `idx_beds_org_room`, `idx_visits_org_checkin`, `idx_tasks_org_status`, `idx_diary_org_date`, `idx_events_org_start`, `idx_expenses_org_date`.
- Added partial unique index `uq_beds_active_resident` to enforce single-bed-per-resident at index level.
- `/api/reports` uses single-pass `COUNT(*) FILTER (WHERE ...)` and `SUM(...)` SQL aggregates inside `withTenantContext()` instead of N+1 client loops.
- List endpoints apply `LIMIT` / `OFFSET` pagination (`LIMIT 50`–`100`) and avoid cross-tenant shared caching.
