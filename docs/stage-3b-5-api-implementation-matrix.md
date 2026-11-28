# ElderCare OS — Stage 3B-5: API Implementation Matrix

**Document ID:** ECO-DOC-S3B5-APIMATRIX-001  
**Date:** November 28, 2026  

---

| Module | Endpoint(s) | Methods | Key Safeguards |
|---|---|---|---|
| 1. Rescue Cases | `/api/rescue-cases`, `/api/rescue-cases/[id]`, `/api/rescue-cases/[id]/convert` | `GET`, `POST`, `PATCH` | `FOR UPDATE` row lock prevents double conversion; quota check; branch filter |
| 2. Medicines | `/api/medicines`, `/api/medicines/[id]` | `GET`, `POST`, `PATCH` | Doctor-only Rx (`medical:prescription:create`); Platform Owners blocked (`403`); prevents duplicate dose administration (`409`) |
| 3. Facilities | `/api/facilities`, `/api/facilities/beds/assign` | `GET`, `POST` | `FOR UPDATE` locks on `beds` + `residents`; `uq_beds_active_resident` prevents double occupancy; atomic bed transfer |
| 4. Visitors | `/api/visitors` | `GET`, `POST` | Masks `id_proof_number` in responses; prevents duplicate check-out (`409`) |
| 5. Staff | `/api/staff`, `/api/staff/[id]` | `GET`, `POST`, `PATCH`, `DELETE` | Blocks self-escalation/self-deactivation (`403`); never exposes `password_hash` or tokens |
| 6. Events | `/api/events` | `GET`, `POST`, `PATCH` | Date-range validation; duplicate title+startTime idempotency |
| 7. Daily Diary | `/api/diary` | `GET`, `POST`, `PATCH` | Author derived from `session.userId`; non-author edits blocked (`403`); no `DELETE` |
| 8. Tasks | `/api/tasks` | `GET`, `POST`, `PATCH` | Verifies assignee is `active` org member; rejects invalid transitions |
| 9. Expenses | `/api/finance/expenses` | `GET`, `POST`, `PATCH` | Blocks self-approval (`403`); no `DELETE` handler (`405`) |
| 10. Reports | `/api/reports` | `GET` | Real SQL aggregates inside `withTenantContext()`; family blocked (`403`); Platform Owner medical omitted |
| 11. Settings | `/api/settings` | `GET`, `PATCH` | Org-scoped profile & branch management; never exposes platform billing or secrets |
