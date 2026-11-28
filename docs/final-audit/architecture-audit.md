# Architecture Audit — ElderCare OS

## Application Architecture & Separation
- **Framework:** Next.js 15.1.7 App Router with React 19, TypeScript 5.7.3, Tailwind CSS, and `pg` connection pooling (`src/lib/db.ts`).
- **Backend / Frontend Separation:** API routes live under `src/app/api/**` (68 `route.ts` files), domain/security services under `src/lib/**` (`auth.ts`, `rbac.ts`, `db.ts`, `security.ts`, `audit.ts`, `billing/*`, `storage/*`, `export/*`, `document-intelligence/*`), and UI pages under `src/app/**`.
- **Database Access Patterns:** Fail-closed multi-tenant isolation via `withTenantContext(organizationId, fn)` (`set_config('app.current_organization_id', orgId, true)`) and MFA-guarded `withPlatformContext(session, fn)` (`set_config('app.is_platform_admin', 'true', true)`).
- **Workers:** Standalone PostgreSQL-backed CLI workers (`scripts/run-export-worker.js`, `scripts/run-doc-intelligence-worker.js`) using `FOR UPDATE SKIP LOCKED` with zero Redis/Docker dependency.

## Findings
- **LOW — Dead / Residual Files (`AUD-LOW-01`):** `src/services/fixtures.ts`, `src/services/mockDataService.ts`, and `scripts/run-export-worker.ts` (superseded by `scripts/run-export-worker.js`) remain in the repository. No production UI page imports `mockDataService.ts`.
- **MEDIUM — Missing Health Check Endpoint (`AUD-MED-01`):** `src/app/api/` has no `/api/health` endpoint for database/storage/worker readiness probes.
- **Maintainability Assessment:** Clear modular boundaries, typed contracts, and consistent `requireTenantPermission` + `withTenantContext` patterns make the codebase straightforward for an incoming engineering team to maintain.
