# Dashboard Routing — ElderCare OS

## Server-Verified Routing (`src/app/page.tsx`, `src/app/login/page.tsx`)
Client-side arbitrary role switching (`switchRole`) has been removed from `AuthContext`, `src/app/page.tsx`, and `MobileDrawer.tsx`.
After authentication (`GET /api/auth/me`):
- Unauthenticated -> `/login`
- Platform Owner (`isPlatformAdmin = true`) -> `/platform/mfa` (if MFA unverified) or `/platform/dashboard`
- Pending / No active NGO membership -> `/pending-approval`
- `doctor` -> `DoctorDashboard`
- `nurse` -> `CaretakerDashboard`
- `staff` -> `StaffDashboard`
- `volunteer` -> `VolunteerDashboard`
- `accountant` -> `AccountantDashboard`
- `family_guardian` -> `FamilyDashboard`
- `ngo_admin` -> `AdministratorDashboard`

Multi-organization users can switch workspaces via `POST /api/auth/switch-workspace`, which re-validates membership in PostgreSQL and re-issues the session token.
