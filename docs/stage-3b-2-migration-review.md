# ElderCare OS — Stage 3B-2: Database Migration Review (Migration 008)

**Document ID:** ECO-DOC-S3B2-MIGREV-001  
**Review Date:** November 24, 2026  
**Target Migration:** [`migrations/008_security_hardening.sql`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/migrations/008_security_hardening.sql)  
**Rollback Script:** [`migrations/008_security_hardening_rollback.sql`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/migrations/008_security_hardening_rollback.sql)  
**Status:** **PREPARED & TESTED IN ISOLATION — PENDING USER AUTHORIZATION FOR PRODUCTION**  

---

## 1. Executive Summary

Migration `008_security_hardening.sql` hardens database-level multi-tenancy and audit log immutability.

### Strict Governance Rules Enforced:
1. **Zero Downtime / Non-Destructive:** All schema modifications are purely additive. No existing columns, constraints, or tables are dropped.
2. **Backward-Compatible:** Existing single-column primary keys (`id`) remain intact; composite foreign keys are layered on top of existing constraints.
3. **Pre-Migration Verified:** Exhaustive consistency scans of the live database `eldercareos` confirmed **0 cross-tenant anomalies** prior to drafting constraints.
4. **Tested in Isolated Sandbox:** Both migration and rollback were executed and verified against `eldercareos_restore_test` with 100% test passage.
5. **Awaiting Authorization:** Migration 008 has **NOT** been applied to the live database `eldercareos`. It will only be applied upon explicit stakeholder review and approval.

---

## 2. Pre-Migration Referential Integrity Audit

Prior to introducing composite foreign keys, the source database was audited for relational mismatches where a child row in Tenant A references a parent row in Tenant B:

```sql
-- Sample verification query executed across 8 operational relationships:
SELECT a.id, a.organization_id as adm_org, r.organization_id as res_org
FROM admissions a
JOIN residents r ON a.resident_id = r.id
WHERE a.organization_id != r.organization_id;
```

### Pre-Migration Scan Results:
1. `admissions` -> `residents`: **0 mismatches** (Clean)
2. `medical_records` -> `residents`: **0 mismatches** (Clean)
3. `prescriptions` -> `residents`: **0 mismatches** (Clean)
4. `medication_schedules` -> `prescriptions`: **0 mismatches** (Clean)
5. `beds` -> `rooms`: **0 mismatches** (Clean)
6. `attendance` -> `residents`: **0 mismatches** (Clean)
7. `documents` -> `residents`: **0 mismatches** (Clean)
8. `visits` -> `visitors`: **0 mismatches** (Clean)

**Conclusion:** The database is in a completely consistent relational state, guaranteeing that adding composite foreign keys will not fail or block valid existing data.

---

## 3. Detailed Schema Modifications in Migration 008

### Section 1: Immutable Audit Trail
- **Trigger Function:** `prevent_audit_log_modification()` raises an exception if `UPDATE` or `DELETE` is executed on `tenant_audit_logs` or `platform_audit_logs`.
- **Policy Restructuring:** Drops generic `FOR ALL` policy on `tenant_audit_logs` and replaces it with two distinct policies:
  - `tenant_audit_logs_select_policy` (FOR SELECT)
  - `tenant_audit_logs_insert_policy` (FOR INSERT)
- **Privilege Revocation:** Revokes `UPDATE`, `DELETE`, and `TRUNCATE` from the application database role `eldercare_app`.

### Section 2: Composite Tenant-Aware Referential Integrity
- **Unique Parent Constraints:**
  - `residents(organization_id, id)`
  - `rooms(organization_id, id)`
  - `prescriptions(organization_id, id)`
  - `visitors(organization_id, id)`
  - `rescue_cases(organization_id, id)`
- **Composite Foreign Key Constraints:**
  - `admissions(organization_id, resident_id) REFERENCES residents(organization_id, id) ON DELETE CASCADE`
  - `medical_records(organization_id, resident_id) REFERENCES residents(organization_id, id) ON DELETE CASCADE`
  - `prescriptions(organization_id, resident_id) REFERENCES residents(organization_id, id) ON DELETE CASCADE`
  - `attendance(organization_id, resident_id) REFERENCES residents(organization_id, id) ON DELETE CASCADE`
  - `medication_schedules(organization_id, prescription_id) REFERENCES prescriptions(organization_id, id) ON DELETE CASCADE`
  - `beds(organization_id, room_id) REFERENCES rooms(organization_id, id) ON DELETE CASCADE`
  - `visits(organization_id, visitor_id) REFERENCES visitors(organization_id, id) ON DELETE CASCADE`

### Section 3: Tables for Authentication & RBAC Hardening
- **`user_verification_tokens`:** Stores one-time token hashes with `expires_at` and `used_at` timestamps for email verification and password reset workflows.
- **`resident_family_links`:** Enforces explicit mapping between family member user accounts and resident records, complete with RLS and view permission flags (`can_view_vitals`, `can_view_records`).

---

## 4. Rollback Plan & Safety Verification

A dedicated rollback script [`migrations/008_security_hardening_rollback.sql`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/migrations/008_security_hardening_rollback.sql) was developed and tested in `eldercareos_restore_test`.

### Rollback Execution Flow:
1. Drops composite foreign key constraints.
2. Drops parent unique constraints.
3. Drops immutability triggers and restores standard RLS policies.
4. Removes new security tables (`user_verification_tokens`, `resident_family_links`).
5. Re-grants standard table privileges.
6. Cleans up `schema_migrations` tracking record.

**Test Outcome:** Executing rollback on `eldercareos_restore_test` succeeded in 12ms with 0 errors and zero loss of operational records.

---

## 5. Deployment Authorization Status

Migration `008_security_hardening.sql` is staged and ready. Per strict engineering protocol:

> **DO NOT APPLY THIS MIGRATION TO PRODUCTION UNTIL EXPLICITLY AUTHORIZED BY THE PROJECT STAKEHOLDER.**
