# Tenant Isolation Audit — ElderCare OS

## Multi-Tenant Enforcement
- **PostgreSQL RLS:** `FORCE ROW LEVEL SECURITY` with `tenant_isolation_policy` (`organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid`) enforced across all 30+ tenant-scoped tables (including Stage 3B-7 `tenant_export_jobs` and Stage 3B-8 `document_processing_jobs`, `document_extraction_results`, `document_review_records`, `generated_form_drafts`).
- **Non-Bypassable App Role:** `eldercare_app` verified as `NOSUPERUSER` and `NOBYPASSRLS`.
- **Composite Foreign Keys:** Cross-tenant FK references (e.g., `fk_admissions_org_resident`, `fk_beds_org_room`) blocked at the database layer.
- **Server-Derived Context:** `requireTenantPermission()` derives `activeOrgId` and `branchId` from verified session + live `organization_memberships` DB lookup, never from client headers or body parameters.
- **Background Workers:** Both `scripts/run-export-worker.js` and `scripts/run-doc-intelligence-worker.js` iterate organizations and enter `withTenant(...)` (`set_config('app.current_organization_id', orgId, true)`) per job.
- **Branch & Family Scoping:** Non-admin staff restricted to assigned `branch_id`; `family_member` restricted to `resident_family_links` and non-confidential documents.
- **Platform Owner Separation:** Platform Owners (`isPlatformAdmin && mfaVerified`) are blocked (`403`) from `/api/medical/records`, `/api/documents*`, `/api/exports*`, `/api/document-intelligence/*`, and `/api/generated-forms*`.
