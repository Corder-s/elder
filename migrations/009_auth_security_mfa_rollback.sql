-- Migration 009 Rollback Script (Non-Destructive)
-- Removes indexes/functions added in 009 while preserving user records and security audit history.

BEGIN;

DROP FUNCTION IF EXISTS cleanup_expired_auth_records();
DROP INDEX IF EXISTS idx_user_sessions_user_active;
DROP INDEX IF EXISTS idx_verif_tokens_user_type_exp;
DROP INDEX IF EXISTS idx_verif_tokens_expires;
DROP INDEX IF EXISTS idx_mfa_recovery_user_unused;
DROP INDEX IF EXISTS idx_auth_rate_limits_key;
DROP INDEX IF EXISTS idx_auth_rate_limits_blocked;
DROP INDEX IF EXISTS idx_auth_events_user_created;
DROP INDEX IF EXISTS idx_auth_events_type_created;

DELETE FROM schema_migrations WHERE name = '009_auth_security_mfa.sql';

COMMIT;
