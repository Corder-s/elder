# ElderCare OS — Operations Runbook
## Local Development, Testing, Backup and Release v1.0

**Note:** Adapt commands to the actual repository and package manager after discovery. Do not run destructive commands against production.

## 1. Environments

Maintain separate environments:
- Local development
- Automated test/CI
- Staging
- Production

Each environment must use separate databases, storage buckets, credentials and integration keys.

## 2. Repository discovery before setup

Before changing code:
1. Inspect the repository tree and README.
2. Identify package manager and lockfile.
3. Inspect frontend/backend frameworks.
4. Inspect Prisma or other database migrations.
5. Identify existing authentication and storage providers.
6. Inspect test, lint and build scripts.
7. Identify environment variables without printing secret values.
8. Check Git status and preserve uncommitted user changes.

Do not delete existing infrastructure or regenerate migrations without understanding current state and taking an appropriate backup.

## 3. Environment configuration

Maintain `.env.example` with variable names and safe placeholders only. Never commit `.env` or real credentials.

Likely configuration groups:
- `NODE_ENV`
- `APP_URL`
- `API_URL`
- `DATABASE_URL`
- `SESSION_SECRET` or identity-provider configuration
- `OBJECT_STORAGE_ENDPOINT`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_ACCESS_KEY`
- `OBJECT_STORAGE_SECRET_KEY`
- `OCR_PROVIDER`
- `OCR_PROVIDER_KEY`
- `AI_PROVIDER`
- `AI_PROVIDER_KEY`
- `MAP_PROVIDER`
- `MAP_PROVIDER_KEY`
- `REDIS_URL` or queue provider configuration
- `EMAIL_PROVIDER` and credentials if enabled
- `BACKUP_DESTINATION` and credentials

Use the actual names required by the implementation. Never use production secrets locally.

## 4. Local development checklist

1. Install dependencies using the repository's documented package manager.
2. Copy `.env.example` to a local-only environment file.
3. Configure a local or approved development PostgreSQL database.
4. Configure private development object storage or a local compatible service.
5. Run database migrations.
6. Seed only synthetic test data.
7. Start API, web application and worker processes as documented.
8. Verify health checks.
9. Verify login and role permissions.
10. Verify a test file upload and download.
11. Run tests before committing.

Do not put real resident or medical data into local development.

## 5. Database migration procedure

Before applying a migration:
- Review generated SQL.
- Check whether it is destructive.
- Confirm backup status for non-local environments.
- Test migration against a copy of representative data.
- Confirm application compatibility during rollout.

For production:
1. Announce maintenance if required.
2. Verify current backup.
3. Apply the approved migration.
4. Run health checks and critical smoke tests.
5. Monitor errors and database performance.
6. Follow a tested rollback/forward-fix plan.

Never edit production schema manually as a substitute for migrations.

## 6. Testing procedure

Run the repository's actual scripts. Typical categories:
- Unit tests.
- API integration tests.
- Database migration tests.
- Authorization tests.
- End-to-end workflow tests.
- Lint and type checks.
- Production build.
- Dependency/security scan.

Critical smoke tests:
1. Create a resident.
2. Create a rescue case.
3. Attach a document.
4. Verify permissions.
5. Convert an approved rescue case into an admission.
6. Allocate a bed and confirm duplicate allocation is blocked.
7. Record attendance and visitor visit.
8. Verify medical data is inaccessible to unauthorized roles.
9. Generate a report.
10. Confirm audit events exist.

## 7. Backup procedure

The final implementation must define exact automated backup commands and schedules. At minimum:
- Database backup.
- Object-storage backup/versioning.
- Encryption.
- Separate backup credentials.
- Retention schedule.
- Backup monitoring.
- Restore instructions.

Do not claim a backup is valid merely because a job reports success. Verify backup integrity and periodically restore it.

## 8. Restore drill

Use an isolated recovery environment.

1. Select a known backup point.
2. Restore PostgreSQL into an isolated database.
3. Restore corresponding object files or storage version.
4. Verify record counts and key relationships.
5. Verify documents can be retrieved using restored metadata.
6. Run critical workflow checks.
7. Record restore duration and any data loss window.
8. Document failures and remediation.
9. Never overwrite production during a drill.

## 9. Document processing operations

Monitor:
- Upload validation failures.
- Malware scan failures.
- OCR queue depth.
- Extraction job failures.
- Provider rate limits.
- AI schema-validation failures.
- Human review backlog.
- PDF generation failures.

Provide retry controls for safe transient failures. A failed extraction must never silently mark a document as processed or verified.

## 10. Incident response

For suspected unauthorized access or data exposure:
1. Protect people and stop ongoing exposure.
2. Disable compromised accounts or revoke sessions.
3. Restrict affected storage/API access.
4. Preserve relevant logs and evidence.
5. Notify the designated organization security/privacy contact.
6. Follow the organization's legal and regulatory notification process.
7. Rotate affected credentials.
8. Restore service only after containment and verification.
9. Document cause, impact and corrective actions.

Do not investigate by copying sensitive resident data into public tools or chat systems.

## 11. Release checklist

- [ ] Product owner approved scope.
- [ ] Environment configuration reviewed.
- [ ] Database migrations reviewed and tested.
- [ ] Backup completed and restore process known.
- [ ] Authentication and authorization tests passed.
- [ ] Sensitive document access tests passed.
- [ ] Critical end-to-end tests passed.
- [ ] No known critical/high security issue remains unresolved.
- [ ] Logs do not contain sensitive data.
- [ ] Monitoring and alerts are active.
- [ ] Rollback/forward-fix plan is ready.
- [ ] User training and support process are ready.
- [ ] Privacy notice and organizational policies are approved.

## 12. Operational ownership

Before production, assign named organizational owners for:
- System administration.
- User and permission approvals.
- Medical record governance.
- Document and compliance management.
- Finance approvals.
- Backup monitoring.
- Security/privacy incidents.
- Vendor and integration management.
