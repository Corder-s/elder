# ElderCare OS — Gap Analysis
**Date:** 14 November 2026  
**Document Status:** Baseline Discovery  
**Comparison Target:** Proposed PRD & Architecture vs. Current Codebase

---

## 1. Status Legend

* **`EXISTS`**: Implemented, verified, and functional in code with tests.
* **`PARTIAL`**: Code or UI present but incomplete, unverified, or using dummy data.
* **`MISSING`**: Specified in requirements/architecture but completely absent from code.
* **`CONFLICT`**: Existing implementation violates or contradicts the approved PRD or architecture.
* **`UNKNOWN`**: Cannot be determined from current codebase state.

---

## 2. Module-by-Module Gap Analysis

| # | Domain Module | Status | Evidence / Repository Path | Details & Findings | Risk / Recommended Action |
|---|---|---|---|---|---|
| 1 | **Authentication & RBAC** | `MISSING` | [PRD.md §5](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L167-L215), [database-schema.md §3](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L32-L105) | No auth service, password hashing, JWT/session management, or permission guards exist. | High Risk. Implement foundational authentication and RBAC before building any business routes. |
| 2 | **Organization & Branch Data Scoping** | `MISSING` | [database-schema.md §3](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L34-L56), [architecture.md §6.2](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/architecture.md#L259-L267) | No multi-tenant/branch context middleware or schema tables exist in code. | Critical. Tenant isolation (`organization_id`, `branch_id`) must be built into base repositories/queries from Day 1 to avoid data leakage. |
| 3 | **Resident Management** | `MISSING` | [PRD.md §7.2](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L300-L315), [database-schema.md §4](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L106-L163) | Neither resident profile API nor UI exists. | High. Priority 1 domain entity. Build along with rescue-to-admission flow. |
| 4 | **Rescue Management** | `MISSING` | [PRD.md §7.3](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L316-L342), [database-schema.md §5](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L164-L240) | No rescue intake, GPS location handling, or timeline tracking present. | High. Core workflow entrance. Requires geolocation provenance verification. |
| 5 | **Admissions Workflow** | `MISSING` | [PRD.md §7.4](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L343-L357), [database-schema.md §5](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L241-L267) | No admission workflow, review approval states, or agreement generators. | High. Must support converting rescue records directly into admissions without re-keying data. |
| 6 | **Medical Records & Medication** | `MISSING` | [PRD.md §7.5, §7.6](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L358-L393), [database-schema.md §6](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L268-L366) | No clinical observation tracking, prescription verification, or medication schedule/dose logging. | Critical Healthcare Safety Risk. Ensure medical role authorization guards are strictly enforced. |
| 7 | **Attendance & Movement** | `MISSING` | [PRD.md §7.7](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L394-L408), [database-schema.md §7](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L368-L392) | No daily roll call, departure/return tracking, or audit logs implemented. | Medium. Needs uniqueness constraint on `(resident_id, attendance_date)`. |
| 8 | **Visitor Management** | `MISSING` | [PRD.md §7.8](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L409-L421), [database-schema.md §7](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L393-L414) | No visitor check-in, check-out, or purpose logs. | Low-Medium. Straightforward CRUD + entry/exit timestamp capture. |
| 9 | **Events & Daily Activities** | `MISSING` | [PRD.md §7.9, §7.10](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L422-L445), [database-schema.md §7](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L415-L450) | No calendar feed, event participant records, or daily diary entries. | Medium. Essential for day-to-day operations and shift handovers. |
| 10 | **Staff & Volunteer Management** | `MISSING` | [PRD.md §7.12](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L455-L465), [database-schema.md §8](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L451-L484) | No employee/volunteer rosters, staff attendance, or duty assignments. | Medium. Links to auth users via `user_id FK`. |
| 11 | **Rooms & Bed Allocation** | `MISSING` | [PRD.md §7.13](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L466-L475), [database-schema.md §8](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L485-L518) | No facility hierarchy (building/room/bed) or allocation rules implemented. | High. Must enforce no overlapping active bed allocations using PostgreSQL exclusion constraints or transaction locks. |
| 12 | **Document Vault & Private Storage**| `MISSING` | [PRD.md §7.16](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L500-L512), [database-schema.md §10](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L620-L660) | No storage adapter, presigned upload/download URL generation, or file checksums. | Critical. Files must remain private; no public bucket or direct browser uploads without signed token. |
| 13 | **OCR & AI Document Extraction** | `MISSING` | [PRD.md §7.17](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L513-L529), [architecture.md §9](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/architecture.md#L573-L625) | No background extraction worker, candidate field storage, or side-by-side verification UI. | High Complexity. Build pluggable provider adapter (abstracting cloud AI/OCR) with human-review gate. |
| 14 | **Dynamic Form Generator & Versions** | `MISSING` | [PRD.md §7.18](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L530-L555), [database-schema.md §10](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L690-L725) | No form schema builder, version immutability engine, or submission snapshot storage. | High Complexity. Target for Phase 4 after core operational records stabilize. |
| 15 | **Finance, Donors & Receipts** | `MISSING` | [PRD.md §7.15](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L485-L499), [database-schema.md §9](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L571-L618) | No donor directory, donation logging, sequential receipt generator, or expense tracking. | High Financial Compliance. Enforce sequential receipt numbers and immutable finalized entries. |
| 16 | **Tasks & Notifications** | `MISSING` | [PRD.md §7.19](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L556-L566), [database-schema.md §11](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L726-L761) | No task assignment, due-date alert triggers, or in-app notification center. | Medium. Useful for medical follow-up and compliance document expiry alerts. |
| 17 | **Reports & Data Exports** | `MISSING` | [PRD.md §7.20](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L567-L579), [database-schema.md §11](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L762-L773) | No PDF/Excel report generator or query filters. | Medium. Must enforce same RBAC filters as live API. |
| 18 | **Audit Logs** | `MISSING` | [PRD.md §10.1](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/PRD.md#L691-L710), [database-schema.md §11](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L774-L788) | No audit middleware or append-only event table. | High. Must be integrated into NestJS interceptors early to trace sensitive read/write operations. |
| 19 | **Backup & Restore Procedures** | `MISSING` | [runbook.md §7, §8](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/runbook.md#L116-L142) | No automated pg_dump / storage backup script or restore drill automation. | Critical Reliability. Script and drill before any production deployment. |
| 20 | **Security Controls & Test Suite** | `MISSING` | [security.md §12](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/security.md#L142-L153), [architecture.md §15](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/architecture.md#L786-L825) | No automated test scripts (Jest/Playwright), vulnerability scanners, or rate-limiters. | High. Add automated test scaffolding as part of Phase 1 foundation. |

---

## 3. Summary of Findings

* **Overall Status:** `0%` implemented in executable code; `100%` specified in architectural design.
* **Conflicts:** None detected. The specifications across all documents are harmonized and ready for implementation.
* **Immediate Priority:** Scaffold the project infrastructure (Next.js + NestJS + Prisma + PostgreSQL) and build the vertical slice for **Rescue $\rightarrow$ Admission $\rightarrow$ Bed Allocation**.

