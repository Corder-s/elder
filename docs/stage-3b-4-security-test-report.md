# ElderCare OS — Stage 3B-4: RBAC & Security Test Report

**Document ID:** ECO-DOC-S3B4-TEST-001  
**Date:** November 27, 2026  
**Target Sandbox:** `eldercareos_restore_test` (Non-superuser `eldercare_app`, `NOBYPASSRLS`)  

---

## 1. Exact Test Commands & Observed Results

| Suite / Check | Command | Exit Code | Result |
|---|---|---|---|
| **Stage 3B-4 RBAC & Isolation** | `node tests/stage-3b-4-rbac.test.js` | `0` | **6 / 6 Suites Passed (100%)** |
| **Stage 3B-3 Auth & Session** | `node tests/stage-3b-3-auth-security.test.js` | `0` | **14 / 14 Suites Passed (100%)** |
| **Stage 3B-2 DB Security** | `node tests/stage-3b-2-database-security.test.js` | `0` | **8 / 8 Tests Passed (100%)** |
| **Tenant Isolation RLS** | `node tests/tenant-isolation.test.js` | `0` | **8 / 8 Tests Passed (100%)** |
| **Dynamic Provisioning** | `node tests/provisioning.test.js` | `0` | **Passed (All 8 roles & quotas verified)** |
| **TypeScript Check** | `npx tsc --noEmit` | `0` | **Passed (0 errors)** |
| **ESLint** | `pnpm lint` | `0` | **Passed (`✔ No ESLint warnings or errors`)** |
| **Production Build** | `pnpm build` | `0` | **Passed (60 / 60 routes compiled)** |

---

## 2. Stage 3B-4 RBAC Vectors Verified (`tests/stage-3b-4-rbac.test.js`)

1. **Test 1 (Unauthenticated Denial):** All 7 operational endpoints (`/api/residents`, `/api/admissions`, `/api/medical/records`, `/api/finance/donations`, `/api/documents`, `/api/attendance`, `/api/subscription/usage`) reject unauthenticated requests with `401`.
2. **Test 2 (Financial Isolation):** `nurse`, `family_member`, and `doctor` receive `403` on `/api/finance/donations`; `accountant` receives `200`.
3. **Test 3 (Medical Privacy & Platform Owner Exclusion):** `accountant` and `platform` (even with an NGO admin membership) receive `403` on `/api/medical/records`. `nurse` can read (`200`) but receives `403` on `POST /api/medical/records`. `doctor` succeeds (`201`).
4. **Test 4 (Family Scoping & IDOR Prevention):** `family_member` sees only linked Resident A in `GET /api/residents` and `GET /api/medical/records?residentId=<ResA>`, and receives `403 Forbidden` when attempting IDOR on Resident B (`?residentId=<ResB>`) on both `/api/medical/records` and `/api/documents`.
5. **Test 5 (Branch Isolation & Confidential Docs):** Branch-1-assigned `nurse` sees only Branch 1 resident; `admin` sees both branches; `family_member` cannot see `is_confidential = true` documents.
6. **Test 6 (Live DB Role Revocation):** Downgrading `doctor` to `accountant` in PostgreSQL immediately revokes `/api/medical/records` access (`403`) on the existing JWT token.
