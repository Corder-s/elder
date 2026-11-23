# ElderCare OS — Stage 3B-2: Database Backup & Restore Drill Verification Report

**Document ID:** ECO-DOC-S3B2-BACKUP-001  
**Verification Date:** November 24, 2026  
**Auditor:** Principal SaaS Architect & PostgreSQL Security Specialist  
**Source Database:** `localhost:5432/eldercareos` (PostgreSQL 18.6 on x86_64-windows)  
**Backup Artifact:** [`backups/eldercareos_phase3b_preflight_backup.sql`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/backups/eldercareos_phase3b_preflight_backup.sql) (126,364 bytes)  
**Isolated Test Target:** `localhost:5432/eldercareos_restore_test` (Temporary Isolated Database)  

---

## 1. Backup Artifact Inspection

The preflight database backup was generated using PostgreSQL native dump tooling and verified for cryptographic and relational integrity:

```
Backup File:          backups/eldercareos_phase3b_preflight_backup.sql
File Size:            126,364 bytes
Dump Tool Version:    pg_dump version 18.6
Database Server:      PostgreSQL 18.6 on x86_64-windows
Client Encoding:      UTF-8
Total CREATE TABLE:   36 Tables
Total RLS Tables:     26 Tables with rowsecurity = true
```

### 1.1 Row-Level Security State in Backup
The dump header contains:
```sql
SET row_security = off;
```
This is a critical verification requirement. When `SET row_security = off` is set and the dump is executed by an authorized role with RLS bypass privileges, `pg_dump` extracts **100% of physical table rows across all tenants** without filtering or omitting records due to missing application tenant session variables.

---

## 2. Isolated Restore Drill Execution & Exact Results

To guarantee that the backup is restorable and that no data corruption or schema omissions exist, a **live restore drill** was executed against a newly created, isolated database `eldercareos_restore_test`.

### 2.1 Drill Execution Sequence
1. Created isolated test database: `CREATE DATABASE eldercareos_restore_test;`.
2. Executed restoration: `psql -d eldercareos_restore_test -f backups/eldercareos_phase3b_preflight_backup.sql`.
3. Validated table-by-table record counts against the source production database `eldercareos`.

### 2.2 Table-by-Table Verification Matrix

| # | Table Name | Source (`eldercareos`) Count | Restored (`eldercareos_restore_test`) Count | RLS Active | Match Status |
|---|---|:---:|:---:|:---:|:---:|
| 1 | `admissions` | 0 | 0 | Yes | **MATCH (100%)** |
| 2 | `attendance` | 0 | 0 | Yes | **MATCH (100%)** |
| 3 | `beds` | 0 | 0 | Yes | **MATCH (100%)** |
| 4 | `branches` | 1 | 1 | Yes | **MATCH (100%)** |
| 5 | `daily_diary` | 0 | 0 | Yes | **MATCH (100%)** |
| 6 | `documents` | 0 | 0 | Yes | **MATCH (100%)** |
| 7 | `donations` | 0 | 0 | Yes | **MATCH (100%)** |
| 8 | `events` | 0 | 0 | Yes | **MATCH (100%)** |
| 9 | `expenses` | 0 | 0 | Yes | **MATCH (100%)** |
| 10 | `invitations` | 0 | 0 | Yes | **MATCH (100%)** |
| 11 | `medical_observations` | 0 | 0 | Yes | **MATCH (100%)** |
| 12 | `medical_records` | 0 | 0 | Yes | **MATCH (100%)** |
| 13 | `medication_schedules` | 0 | 0 | Yes | **MATCH (100%)** |
| 14 | `organization_memberships` | 1 | 1 | Yes | **MATCH (100%)** |
| 15 | `organizations` | 2 | 2 | No | **MATCH (100%)** |
| 16 | `payment_webhook_events` | 0 | 0 | No | **MATCH (100%)** |
| 17 | `permissions` | 49 | 49 | No | **MATCH (100%)** |
| 18 | `platform_audit_logs` | 1 | 1 | No | **MATCH (100%)** |
| 19 | `prescriptions` | 0 | 0 | Yes | **MATCH (100%)** |
| 20 | `rescue_cases` | 0 | 0 | Yes | **MATCH (100%)** |
| 21 | `residents` | 0 | 0 | Yes | **MATCH (100%)** |
| 22 | `role_permissions` | 49 | 49 | No | **MATCH (100%)** |
| 23 | `roles` | 8 | 8 | Yes | **MATCH (100%)** |
| 24 | `rooms` | 0 | 0 | Yes | **MATCH (100%)** |
| 25 | `schema_migrations` | 7 | 7 | No | **MATCH (100%)** |
| 26 | `subscription_invoices` | 0 | 0 | Yes | **MATCH (100%)** |
| 27 | `subscription_payments` | 0 | 0 | No | **MATCH (100%)** |
| 28 | `subscription_plans` | 3 | 3 | No | **MATCH (100%)** |
| 29 | `tasks` | 0 | 0 | Yes | **MATCH (100%)** |
| 30 | `tenant_audit_logs` | 0 | 0 | Yes | **MATCH (100%)** |
| 31 | `tenant_subscriptions` | 1 | 1 | Yes | **MATCH (100%)** |
| 32 | `usage_records` | 4 | 4 | Yes | **MATCH (100%)** |
| 33 | `user_sessions` | 0 | 0 | No | **MATCH (100%)** |
| 34 | `users` | 2 | 2 | No | **MATCH (100%)** |
| 35 | `visitors` | 0 | 0 | Yes | **MATCH (100%)** |
| 36 | `visits` | 0 | 0 | Yes | **MATCH (100%)** |

**Restoration Result:** 36 of 36 tables matched with 0 count discrepancies. 26/26 Row-Level Security policies restored intact.

---

## 3. Analysis of `BYPASSRLS` Requirement & Alternatives

### 3.1 Why `pg_dump` Failed Under `eldercare_app`
When we initially attempted to run `pg_dump` under the runtime application user `eldercare_app`, PostgreSQL halted with:
```
pg_dump: error: query failed: ERROR: query would be affected by row-level security policy for table "admissions"
```
**Technical Cause:** Under PostgreSQL architecture, when Row-Level Security is active on a table with `FORCE ROW LEVEL SECURITY`, any role that lacks the `BYPASSRLS` attribute is subject to RLS evaluation during a dump query (`COPY ... TO stdout`). Because `pg_dump` runs without an active `app.current_organization_id` session setting, PostgreSQL refuses to dump partial or empty tables, aborting the backup to protect tenant privacy.

### 3.2 Evaluation of Alternatives

| Option | Architecture | Security Assessment | Operational Viability |
|---|---|---|---|
| **Option 1: Superuser Dumps** | Run `pg_dump -U postgres` | **Poor Least-Privilege:** Superuser has unrestricted OS command execution (`COPY ... FROM PROGRAM`), can drop databases, and bypasses all system logging. | Viable locally, but unacceptable in high-compliance SaaS production environments. |
| **Option 2: `--enable-row-security`** | Dump tables with tenant filters | **Critical Backup Flaw:** Only dumps data matching the single tenant context provided. Fails to generate a complete multi-tenant cluster backup. | Not viable for disaster recovery. |
| **Option 3: Dedicated Backup Role (`eldercare_backup`)** | Create role with `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, `BYPASSRLS` and `SELECT` only on public schema. | **Strong Least-Privilege:** Cannot write data, cannot execute DDL, cannot create users, cannot access OS shell. Restricts bypass strictly to read-only backup queries. | **Recommended Architecture Standard.** |

### 3.3 Specification for Dedicated Backup Role (`eldercare_backup`)
When approved for deployment:
1. **Creation:**
   ```sql
   CREATE ROLE eldercare_backup WITH LOGIN PASSWORD '***' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
   GRANT CONNECT ON DATABASE eldercareos TO eldercare_backup;
   GRANT USAGE ON SCHEMA public TO eldercare_backup;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO eldercare_backup;
   ```
2. **Access Boundary:** Restricted in `pg_hba.conf` to local loopback connections (`127.0.0.1/32` or Unix socket) only.
3. **Application Separation:** Application connection strings in `.env` **must never** use `eldercare_backup`. Application traffic remains locked to `eldercare_app` (`NOBYPASSRLS`).
4. **Audit:** Automated backup scripts log each execution timestamp and output file checksum to `/var/log/eldercareos/backups.log`.
