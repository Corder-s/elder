# ElderCare OS — Stage 3B-5: Security & Operational Test Report

**Document ID:** ECO-DOC-S3B5-TEST-001  
**Date:** November 28, 2026  
**Sandbox Database:** `eldercareos_restore_test` (Production `eldercareos` untouched)  

---

## 1. Exact Verification Commands & Observed Results

| Suite / Gate | Command | Exit Code | Result |
|---|---|---|---|
| **Stage 3B-5 Operational Modules** | `node tests/stage-3b-5-operational-modules.test.js` | `0` | **10 / 10 Suites Passed (100%)** |
| **Stage 3B-4 RBAC & Isolation** | `node tests/stage-3b-4-rbac.test.js` | `0` | **6 / 6 Suites Passed (100%)** |
| **Stage 3B-3 Auth & Session** | `node tests/stage-3b-3-auth-security.test.js` | `0` | **14 / 14 Suites Passed (100%)** |
| **Stage 3B-2 DB Security** | `node tests/stage-3b-2-database-security.test.js` | `0` | **8 / 8 Tests Passed (100%)** |
| **Tenant Isolation RLS** | `node tests/tenant-isolation.test.js` | `0` | **8 / 8 Tests Passed (100%)** |
| **Dynamic Provisioning** | `node tests/provisioning.test.js` | `0` | **Passed (All 8 roles & quotas)** |
| **TypeScript Check** | `npx tsc --noEmit` | `0` | **Passed (0 errors)** |
| **ESLint** | `pnpm lint` | `0` | **Passed (`✔ No ESLint warnings or errors`)** |
| **Production Build** | `pnpm build` | `0` | **Passed (72 / 72 routes compiled)** |

---

## 2. Stage 3B-5 Security Coverage (`tests/stage-3b-5-operational-modules.test.js`)

1. Unauthenticated requests return `401` across all 11 operational endpoints.
2. Empty database returns genuine `[]` arrays with zero fixture fallback leakage.
3. Rescue case creation, cross-tenant `404` isolation, transactional conversion, and double-conversion `409` rejection.
4. Medicines: Doctor-only prescription creation (`nurse` gets `403`), Platform Owner blocked (`403`), cross-resident schedule rejected (`400`), volunteer dose administration blocked (`403`), duplicate dose administration blocked (`409`).
5. Facilities & Beds: Atomic bed assignment, duplicate bed occupancy blocked (`409`), cross-tenant bed assignment blocked (`404`).
6. Visitors: Check-in/out, masked `id_proof_number`, duplicate check-out blocked (`409`).
7. Staff: Self-role-escalation blocked (`403`).
8. Events, Diary, Tasks: Non-author diary edits blocked (`403`), inactive members blocked from task assignment (`400`).
9. Expenses: Self-approval blocked (`403`), `DELETE` rejected (`405`).
10. Reports & Settings: Family members blocked from org-wide reports (`403`), Org B report isolated (`0` residents), non-admin settings modification blocked (`403`).
