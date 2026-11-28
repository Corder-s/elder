# User Onboarding Flow

## Method A: Invitation (Default & Initial NGO Administrator)
1. NGO Administrator (`POST /api/staff` with `org:member:invite`) or Platform Owner (`POST /api/platform/organizations` for initial admin) creates an invitation with email, role, branch, optional name/message, and 7-day expiry.
2. Only the SHA-256 `token_hash` is persisted in `invitations` (`token` column remains `NULL`).
3. Invitees open `/accept-invitation?token=...` (`GET /api/invitations/accept?token=...` validates expiry, revocation, and single-use status via `SECURITY DEFINER` `resolve_invitation_by_token_hash`).
4. Submitting `POST /api/invitations/accept` sets password/profile (if unverified), activates the organization-scoped `organization_memberships` record, and marks `accepted_at = CURRENT_TIMESTAMP` inside one transaction.

## Method B: Request Organization Access
1. Controlled per organization via `organizations.allow_access_requests` (default `true`; configurable by Platform Owner).
2. Users specify an organization code/slug during registration (`POST /api/auth/register`) or from `/pending-approval` (`POST /api/auth/request-access`).
3. Creates a `registration_requests` record (`status = 'pending_approval'`) without granting any membership or dashboard access.
4. NGO Administrator approves or rejects the request via `POST /api/staff/registration-requests`.
