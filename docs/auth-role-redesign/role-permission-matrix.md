# Role-to-Permission Matrix — ElderCare OS

| Role Slug | Workspace | Key Permissions |
|---|---|---|
| `admin` (NGO Admin / Branch Admin) | Administrative | `org:*`, `resident:*`, `rescue:*`, `facility:*`, `visitor:*`, `document:*`, `finance:*`, `medical:record:read`, `medical:vitals:read`, `medical:prescription:read`, `org:data:export` |
| `doctor` | Medical | `medical:*`, `resident:read`, `rescue:read`, `facility:read`, `document:read`, `document:process`, `document:extraction:read`, `document:review`, `document:approve`, `form:*`, `report:read` |
| `nurse` | Nursing | `resident:read`, `medical:record:read`, `medical:vitals:read`, `medical:vitals:create`, `medical:prescription:read`, `medical:schedule:administer`, `attendance:*`, `diary:*`, `document:extraction:read`, `form:read` (no `document:approve`, no `medical:prescription:create`) |
| `accountant` | Finance | `finance:*`, `resident:read`, `org:subscription:read`, `document:read`, `report:read` (no `medical:*`) |
| `staff` (Staff / Caretaker / Worker) | Operations | `resident:read/create/update`, `rescue:read/create/update`, `attendance:*`, `diary:*`, `facility:read`, `visitor:*`, `document:read/upload/process/review`, `event:*`, `task:*` (no confidential medical records) |
| `volunteer` | Volunteer | `resident:read`, `rescue:read/create`, `visitor:log`, `diary:read`, `event:read`, `task:read/update` |
| `family_member` | Family Portal | `family:resident:view_own` (strictly scoped via `resident_family_links`) |
| `auditor` | Audit | `resident:read`, `org:audit:read`, `finance:donation:read`, `finance:expense:read`, `document:read`, `report:read` |
| Platform Owner (`is_platform_admin = true`) | Super Admin (`/platform/*`) | `platform:*` (MFA required; strictly blocked `403` from NGO clinical, document, export, and AI extraction APIs) |
