# Organization Membership Model

## Organization-Scoped Memberships
- One global `users` identity can hold zero, one, or multiple `organization_memberships` records.
- Each membership scopes `(user_id, organization_id)` to its own `role_id`, `branch_id`, and `status` (`active`, `pending_approval`, `suspended`, `revoked`).
- NGO roles are never stored as global user properties.

## Login & Workspace Switching
- **Platform Owner:** Redirects to `/platform/mfa` (if MFA pending) or `/platform/overview`.
- **Single Active Membership:** Resolves organization and role from PostgreSQL and redirects to `/`.
- **Multiple Active Memberships:** Redirects to `/role-selection` (Workspace Selector), listing only server-authorized organizations. Selecting a workspace calls `POST /api/auth/switch-workspace`, which re-validates membership and active status in PostgreSQL before minting a scoped session token.
- **No Membership / Pending Membership:** Redirects to `/pending-approval` with logout, invitation acceptance, and access-request controls (never Create Organization).
- **Suspended / Revoked Membership:** Rejected at login, workspace switching (`403`), and live session verification (`requireTenantPermission`).
