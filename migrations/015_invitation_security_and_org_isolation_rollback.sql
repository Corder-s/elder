-- Rollback for Migration 015
DROP FUNCTION IF EXISTS resolve_invitation_by_token_hash(VARCHAR);
DROP INDEX IF EXISTS idx_invitations_org_email_active;
DROP INDEX IF EXISTS idx_invitations_token_hash;

ALTER TABLE invitations
  DROP COLUMN IF EXISTS invitation_type,
  DROP COLUMN IF EXISTS revoked_at,
  DROP COLUMN IF EXISTS message,
  DROP COLUMN IF EXISTS invitee_name,
  DROP COLUMN IF EXISTS token_hash;

ALTER TABLE organizations
  DROP COLUMN IF EXISTS allow_access_requests;
