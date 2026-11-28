# Organization Ownership Model

## Core Rule
Only an MFA-verified **Platform Owner / Super Admin** (`is_platform_admin = true` and `mfaVerified = true`) can create new NGO organizations.

## Root Cause of the Bug
1. `POST /api/tenants/register` (`src/app/api/tenants/register/route.ts`) was listed in `PUBLIC_ROUTES` in `src/middleware.ts` and allowed unauthenticated or NGO-level users to provision new organizations and auto-assign themselves as NGO Administrator.
2. `src/middleware.ts` redirected authenticated users without `activeOrgId` to `/register-ngo`.
3. `src/app/pending-approval/page.tsx` included a demo bypass (`handleTestDemoAccess`).

## Enforced Controls
- `POST /api/tenants/register` now enforces `session.isPlatformAdmin && session.mfaVerified` and returns HTTP `403` for all non-Platform-Owner callers (while unauthenticated callers receive `401` from middleware).
- `src/app/register-ngo/page.tsx` no longer renders organization creation forms.
- `POST /api/platform/organizations` (`src/app/api/platform/organizations/route.ts`) provisions an organization, initial branch, 8 scoped roles and `role_permissions`, subscription, usage records, initial NGO Administrator invitation (`token_hash`, `invitation_type = 'initial_admin'`), and `platform_audit_logs` inside a single `withPlatformContext` transaction.
