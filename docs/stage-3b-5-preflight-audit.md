# ElderCare OS — Stage 3B-5: Preflight Audit

**Document ID:** ECO-DOC-S3B5-PREFLIGHT-001  
**Date:** November 28, 2026  

---

## 1. Baseline & Gaps Identified

Before Stage 3B-5, 11 operational modules were disconnected from PostgreSQL or used client-side fixture fallbacks:
1. `src/services/mockDataService.ts` fell back to `DEV_FIXTURE_*` arrays on API failures or empty responses, and `getCurrentUser()` returned `DEV_FIXTURE_CURRENT_USER`.
2. `rescue-cases`, `medicines`, `events`, and `reports` pages used local hardcoded arrays instead of APIs.
3. `GlobalSearchModal.tsx` imported `DEV_FIXTURE_RESIDENTS` and `DEV_FIXTURE_RESCUES`.
4. Missing granular permissions for `events`, `tasks`, `diary:update`, `finance:expense:approve`, and `report:read` in `permissions` and `provision_new_ngo_workspace()`.
5. `beds` lacked a database-level partial unique index preventing a single resident from occupying multiple beds concurrently.
