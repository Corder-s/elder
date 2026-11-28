# Stage 3B-7 Tenant Data Portability & Export Design

## Endpoints
- `GET /api/exports` & `POST /api/exports`: Requires `org:data:export` permission (assigned to NGO `admin` roles).
- `GET /api/exports/[id]/download-url`: Verifies `org:data:export`, org ownership, `status = 'completed'`, and non-expired `expires_at`, returning a 3-minute presigned download URL + SHA-256 checksum.

## Asynchronous Worker (`scripts/run-export-worker.js`, `src/lib/export/tenant-export-service.ts`)
- Database-backed queue (`tenant_export_jobs`, protected by `FORCE ROW LEVEL SECURITY`).
- Claims jobs safely using `FOR UPDATE SKIP LOCKED` with automatic retry up to `max_attempts` (3).
- Exports organization, branches, residents, admissions, rescue cases, medical records/observations, prescriptions, medication schedules, attendance, rooms/beds, visitors/visits, staff memberships (safe projection), tasks, daily diary, events, sanitized document metadata, donations, expenses, and audit logs.
- Explicitly excludes `password_hash`, `mfa_secret`, `mfa_recovery_codes`, JWTs, session secrets, payment gateway secrets, and other tenants' data.
- Packages `manifest.json`, `data/*.json`, `csv/*.csv`, and authorized `available` document files (`documents/<id>_<fileName>`) into a SHA-256 checksummed ZIP (or JSON) archive stored in private S3 (`72h` expiration).
- Local CLI command: `node scripts/run-export-worker.js --once` (or `--watch`).
