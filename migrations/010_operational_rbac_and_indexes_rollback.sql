-- Migration 010 Rollback Script (Non-Destructive)
-- Removes indexes added in 010 while preserving operational data and audit trails.

BEGIN;

DROP INDEX IF EXISTS uq_beds_active_resident;
DROP INDEX IF EXISTS idx_rescue_org_status;
DROP INDEX IF EXISTS idx_prescriptions_org_res;
DROP INDEX IF EXISTS idx_med_sched_org_status;
DROP INDEX IF EXISTS idx_beds_org_room;
DROP INDEX IF EXISTS idx_visits_org_checkin;
DROP INDEX IF EXISTS idx_tasks_org_status;
DROP INDEX IF EXISTS idx_diary_org_date;
DROP INDEX IF EXISTS idx_events_org_start;
DROP INDEX IF EXISTS idx_expenses_org_date;

DELETE FROM schema_migrations WHERE name = '010_operational_rbac_and_indexes.sql';

COMMIT;
