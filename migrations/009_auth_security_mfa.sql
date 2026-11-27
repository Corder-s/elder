-- Migration 009: Authentication Security, Sessions, Rate Limiting & Platform Owner MFA
-- Target: ElderCare OS PostgreSQL Schema
-- Strict Compliance: Additive, Non-Destructive, Preserves All Existing Users & Records

BEGIN;

-- ============================================================================
-- 1. ADDITIVE SECURITY COLUMNS ON USERS
-- ============================================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 2. ENHANCE USER_SESSIONS FOR SERVER-SIDE REVOCATION & METADATA
-- ============================================================================
ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS device_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
    ON user_sessions(user_id, is_revoked, expires_at);

-- ============================================================================
-- 3. INDEXES & RETENTION FOR USER_VERIFICATION_TOKENS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_verif_tokens_user_type_exp
    ON user_verification_tokens(user_id, token_type, expires_at);

CREATE INDEX IF NOT EXISTS idx_verif_tokens_expires
    ON user_verification_tokens(expires_at);

-- ============================================================================
-- 4. PLATFORM OWNER & ADMIN TOTP MFA TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_mfa_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret_encrypted TEXT NOT NULL,
    iv VARCHAR(64) NOT NULL,
    auth_tag VARCHAR(64) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_user_mfa_secrets_updated_at ON user_mfa_secrets;
CREATE TRIGGER trg_user_mfa_secrets_updated_at
BEFORE UPDATE ON user_mfa_secrets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS user_mfa_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_user_unused
    ON user_mfa_recovery_codes(user_id) WHERE used_at IS NULL;

-- ============================================================================
-- 5. RATE LIMITING & BRUTE-FORCE PROTECTION BUCKETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS auth_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_key VARCHAR(255) NOT NULL UNIQUE,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_key ON auth_rate_limits(bucket_key);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_blocked ON auth_rate_limits(blocked_until);

-- ============================================================================
-- 6. IMMUTABLE AUTHENTICATION SECURITY EVENTS LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS auth_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    organization_id UUID,
    event_type VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE auth_security_events
    DROP CONSTRAINT IF EXISTS auth_security_events_user_id_fkey,
    DROP CONSTRAINT IF EXISTS auth_security_events_organization_id_fkey;

CREATE INDEX IF NOT EXISTS idx_auth_events_user_created ON auth_security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_type_created ON auth_security_events(event_type, created_at DESC);

-- Enforce immutability if prevent_audit_log_modification() exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'prevent_audit_log_modification') THEN
        DROP TRIGGER IF EXISTS trg_auth_security_events_immutable ON auth_security_events;
        CREATE TRIGGER trg_auth_security_events_immutable
        BEFORE UPDATE OR DELETE ON auth_security_events
        FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
    END IF;
END $$;

-- ============================================================================
-- 7. EXPIRED TOKEN & SESSION RETENTION CLEANUP FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_auth_records()
RETURNS TABLE(deleted_tokens BIGINT, deleted_rate_limits BIGINT, deleted_sessions BIGINT) AS $$
DECLARE
    v_tokens BIGINT := 0;
    v_limits BIGINT := 0;
    v_sessions BIGINT := 0;
BEGIN
    DELETE FROM user_verification_tokens
    WHERE expires_at < (CURRENT_TIMESTAMP - INTERVAL '7 days');
    GET DIAGNOSTICS v_tokens = ROW_COUNT;

    DELETE FROM auth_rate_limits
    WHERE last_attempt_at < (CURRENT_TIMESTAMP - INTERVAL '24 hours')
      AND (blocked_until IS NULL OR blocked_until < CURRENT_TIMESTAMP);
    GET DIAGNOSTICS v_limits = ROW_COUNT;

    DELETE FROM user_sessions
    WHERE expires_at < (CURRENT_TIMESTAMP - INTERVAL '30 days');
    GET DIAGNOSTICS v_sessions = ROW_COUNT;

    RETURN QUERY SELECT v_tokens, v_limits, v_sessions;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. SECURITY DEFINER MEMBERSHIP RESOLVER (FOR NON-SUPERUSER LOGIN)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_active_memberships(p_user_id UUID)
RETURNS TABLE(
    organization_id UUID,
    organization_name VARCHAR(255),
    organization_slug VARCHAR(63),
    organization_status organization_status,
    role_id UUID,
    role_slug VARCHAR(50),
    role_name VARCHAR(100),
    branch_id UUID,
    title VARCHAR(100),
    status membership_status
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.organization_id,
        o.name,
        o.slug,
        o.status,
        r.id,
        r.slug,
        r.name,
        m.branch_id,
        m.title,
        m.status
    FROM organization_memberships m
    JOIN organizations o ON m.organization_id = o.id
    JOIN roles r ON m.role_id = r.id
    WHERE m.user_id = p_user_id
      AND m.status = 'active'
      AND o.status IN ('active', 'trial')
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. LEAST-PRIVILEGE GRANTS FOR eldercare_app
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eldercare_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON user_mfa_secrets TO eldercare_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON user_mfa_recovery_codes TO eldercare_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON auth_rate_limits TO eldercare_app;
        REVOKE UPDATE, DELETE, TRUNCATE ON auth_security_events FROM eldercare_app;
        GRANT SELECT, INSERT ON auth_security_events TO eldercare_app;
        GRANT EXECUTE ON FUNCTION cleanup_expired_auth_records() TO eldercare_app;
        GRANT EXECUTE ON FUNCTION get_user_active_memberships(UUID) TO eldercare_app;
    END IF;
END $$;

COMMIT;
