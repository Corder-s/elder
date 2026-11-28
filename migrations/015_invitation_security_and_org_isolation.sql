-- =============================================================================
-- Migration 015: Invitation Token Hashing, Revocation & Access-Request Policy
-- Additive, non-destructive migration preserving all existing data and FORCE RLS
-- =============================================================================

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS invitee_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_type VARCHAR(30) NOT NULL DEFAULT 'member_invite';

ALTER TABLE invitations
  ALTER COLUMN token DROP NOT NULL;

-- Backfill SHA-256 token_hash for any legacy plaintext invitation tokens
UPDATE invitations
SET token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex'),
    token = NULL
WHERE token_hash IS NULL AND token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token_hash
  ON invitations(token_hash)
  WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invitations_org_email_active
  ON invitations(organization_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Organization-level toggle for Method B (Request Organization Access)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS allow_access_requests BOOLEAN NOT NULL DEFAULT true;

GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO eldercare_app;
GRANT SELECT, UPDATE ON organizations TO eldercare_app;

-- SECURITY DEFINER resolver for single-use invitation lookup by SHA-256 token_hash
-- Preserves FORCE ROW LEVEL SECURITY on invitations without exposing table-wide reads.
CREATE OR REPLACE FUNCTION resolve_invitation_by_token_hash(p_token_hash VARCHAR)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  email VARCHAR,
  invitee_name VARCHAR,
  role_id UUID,
  branch_id UUID,
  invitation_type VARCHAR,
  message TEXT,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  organization_name VARCHAR,
  organization_slug VARCHAR,
  organization_status VARCHAR,
  role_name VARCHAR,
  role_slug VARCHAR,
  branch_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.organization_id, i.email, i.invitee_name, i.role_id, i.branch_id,
         i.invitation_type, i.message, i.expires_at, i.accepted_at, i.revoked_at,
         o.name, o.slug, o.status::VARCHAR,
         r.name, r.slug,
         b.name
  FROM invitations i
  JOIN organizations o ON i.organization_id = o.id
  JOIN roles r ON i.role_id = r.id
  LEFT JOIN branches b ON i.branch_id = b.id
  WHERE i.token_hash = p_token_hash
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_invitation_by_token_hash(VARCHAR) TO eldercare_app;
