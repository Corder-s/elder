# Database Reliability Audit — ElderCare OS

## Migration & Schema Status
- **Ordered Migrations:** `001` through `013` are sequentially numbered with rollback scripts for `008` through `013`.
- **Environment Split Observed (`node scripts/check-migrations.js`):**
  - Production `eldercareos` currently has migrations `001`–`007` applied (per strict rule: production DB was NOT migrated during Stages 3B-3..3B-8 or this audit).
  - Isolated sandbox `eldercareos_restore_test` has all migrations `001`–`013` applied and verified.
- **Foreign-Key & Cross-Tenant Integrity (`node scripts/inspect-foreign-keys.js`):** All 8 composite foreign-key checks on `eldercareos` returned `0` cross-tenant mismatches.
- **Transactions & Concurrency:** `withTenantContext` wraps tenant operations in `BEGIN ... COMMIT` with transaction-local `set_config`; quota checks use `FOR UPDATE OF ts`; workers use `FOR UPDATE ... SKIP LOCKED`.
