# Account Settings & Navigation Layout — ElderCare OS

## Left-Side Navigation Drawer (`src/components/layout/MobileDrawer.tsx`)
- Moved from `right-0` (`slide-in-from-right`) to `left-0` (`slide-in-from-left`).
- Navigation links are filtered dynamically by `hasPermission(...)` so users only see modules authorized for their role.
- Replaced client-side role spoofing dropdown with a server-backed Workspace Switcher (shown only when `memberships.length > 1`).

## Left-Side Account Settings Sidebar (`src/app/settings/page.tsx`)
- Responsive 12-column grid (`md:col-span-4` sticky left sidebar + `md:col-span-8` right content panel).
- Left Sidebar Sections: `Profile`, `Personal Information`, `Security`, `Password`, `MFA`, `Sessions` (backed by `/api/auth/sessions`), `Notifications`, `Preferences`, `Organization Settings` (visible only to `org:settings:read` / `ngo_admin`), and `Logout`.
