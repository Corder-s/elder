# Registration Workflow — ElderCare OS

## Account Type Selection (`src/lib/role-catalog.ts`, `src/app/register/page.tsx`)
1. **Step 1 — Select Your Account Type:**
   - **A. Medical & Healthcare:** Doctor, Nurse
   - **B. Care & Operations:** Caretaker, Staff, Worker, Volunteer
   - **C. Administration:** NGO Administrator, Branch Administrator, Accountant
   - **D. Family:** Family Member / Guardian
   - **Super Admin / Platform Owner** is strictly excluded from public registration (`403 Forbidden` in `POST /api/auth/register`).
2. **Step 2 — Personal & Workspace Info:** Full Name, Email, Mobile Number, Password, Confirm Password, optional NGO Workspace Slug.
3. **Step 3 — Submission & Status:**
   - Creates `users` row (`email_verified_at = NULL`, `is_platform_admin = false`).
   - Never creates `organization_memberships` or grants permissions.
   - Creates `registration_requests` (`status = 'pending_approval'`) when an NGO slug is supplied, or reports `invitation_required`.
4. **NGO Admin Approval (`GET/POST /api/staff/registration-requests`, `src/app/staff/page.tsx`):**
   - NGO Administrator reviews `requested_account_type`, assigns an authorized role + optional branch, enforces staff quota, activates `organization_memberships`, and records `role_assignment_history`.
