# Tenant Isolation Verification

## PostgreSQL Row-Level Security
All 19 core tenant tables (`admissions`, `attendance`, `branches`, `document_processing_jobs`, `documents`, `donations`, `events`, `expenses`, `invitations`, `medical_records`, `medication_schedules`, `organization_memberships`, `prescriptions`, `registration_requests`, `rescue_cases`, `residents`, `roles`, `tasks`, `visitors`) enforce `RELROWSECURITY = true` and `RELFORCEROWSECURITY = true`.

## Server-Side Derivation
- `requireTenantPermission()` derives `activeOrgId` exclusively from the verified server session + live `organization_memberships` lookup.
- Frontend-supplied `organization_id` parameters cannot override `app.current_organization_id` in `withTenantContext`.
- Unauthenticated invitation lookups use `resolve_invitation_by_token_hash(VARCHAR)` (`SECURITY DEFINER`) to preserve `FORCE ROW LEVEL SECURITY` on `invitations` while preventing table-wide reads.
