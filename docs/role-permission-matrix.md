# ElderCare OS — Granular Role-Based Access Control (RBAC) Matrix

**Document ID:** ECO-DOC-RBAC-001  
**Version:** 1.0.0  
**Status:** Approved  
**Classification:** Security Architecture & Authorization Standard  

---

## 1. Authorization Architecture & Boundaries

ElderCare OS enforces a **Two-Tier Hierarchical Authorization System**:
1. **Platform Level (Global Scope):** Managed exclusively by the Platform Owner (`platform_super_admin`) to oversee multi-tenant organizations, subscription plans, platform infrastructure, and payment telemetry.
2. **Workspace Level (Tenant Scope):** Managed by NGO Administrators within an isolated organization (`organization_id`).

### 1.1 Strict Boundary Rules

```
                      +------------------------------------------+
                      |         PLATFORM OWNER SCOPE             |
                      |  - Manage NGOs & Subscriptions           |
                      |  - Monitor System Telemetry & Gateways   |
                      |  - CANNOT view resident medical records* |
                      +--------------------+---------------------+
                                           |
                              STRICT TENANT ISOLATION
                                           |
   +---------------------------------------+---------------------------------------+
   |                                                                               |
   v                                                                               v
+--------------------------------------+   +---------------------------------------+
|        NGO WORKSPACE A SCOPE         |   |         NGO WORKSPACE B SCOPE         |
|  (e.g., Sri Seva Old Age Home)       |   |  (e.g., Karuna Elder Care Ashram)     |
|  - Admins, Doctors, Nurses, Staff    |   |  - Admins, Doctors, Nurses, Staff     |
|  - Resident records, Vitals, Beds    |   |  - Resident records, Vitals, Beds     |
|  - CANNOT view Workspace B data      |   |  - CANNOT view Workspace A data       |
+--------------------------------------+   +---------------------------------------+
```

> [!IMPORTANT]
> **HIPAA/DISHA Medical Privacy Principle:** Platform Owners do **NOT** have default read access to resident health records, prescriptions, or clinical notes across tenant workspaces. Only authorized healthcare personnel (Doctors, Nurses, NGO Admins) within that specific tenant membership hold access.

---

## 2. Granular Permission Code Catalog

Permissions follow the format `<domain>:<resource>:<action>` or `<domain>:<action>`.

### 2.1 Platform Operations
- `platform:org:create` — Provision new NGO workspace.
- `platform:org:read` — View NGO metadata, plan, and status across platform.
- `platform:org:update` — Update NGO subscription, status, or quota overrides.
- `platform:org:suspend` — Suspend an NGO workspace for non-payment or TOS breach.
- `platform:plan:manage` — Create and modify commercial subscription plans.
- `platform:billing:read` — View platform-level Stripe/Razorpay revenue & webhook logs.
- `platform:audit:read` — View global platform audit logs.

### 2.2 Workspace & Identity Administration
- `org:settings:read` — View NGO profile, branch configuration, preferences.
- `org:settings:update` — Update NGO profile, logo, timezone, branch details.
- `org:subscription:read` — View tenant subscription, invoices, and payment status.
- `org:subscription:manage` — Upgrade plan, update payment methods, cancel subscription.
- `org:member:invite` — Invite new staff, doctors, volunteers, or family members.
- `org:member:read` — View list of organization members and active sessions.
- `org:member:update` — Change member roles, branch assignments, or permissions.
- `org:member:deactivate` — Suspend or remove member from workspace.
- `org:audit:read` — View tenant-level operational audit logs.

### 2.3 Resident Management
- `resident:read` — View resident demographics, room assignments, emergency contacts.
- `resident:create` — Admit a new resident (verifies quota).
- `resident:update` — Update resident demographic or care plan details.
- `resident:discharge` — Formal discharge or mark resident as deceased.
- `resident:delete` — Soft-delete resident record (restricted to NGO Admin).

### 2.4 Rescue Operations
- `rescue:read` — View rescue case registry, location data, and status.
- `rescue:create` — Log a new rescue case reported by helpline or public.
- `rescue:update` — Update rescue progress, assign rescue team, record transit.
- `rescue:convert` — Convert rescued individual into an admitted resident.

### 2.5 Clinical & Medical Care
- `medical:record:read` — View medical history, diagnoses, and lab results.
- `medical:record:create` — Create medical notes, record check-up findings.
- `medical:vitals:read` — View BP, glucose, SpO2, temperature charts.
- `medical:vitals:create` — Record daily vitals and observations.
- `medical:prescription:read` — View current and historical prescriptions.
- `medical:prescription:create` — Write or discontinue medications (Doctor only).
- `medical:schedule:administer` — Mark scheduled medications as administered/skipped.

### 2.6 Daily Care & Attendance
- `attendance:read` — View resident and staff attendance roll calls.
- `attendance:mark` — Record morning/evening presence or hospital leave.
- `diary:read` — Read daily care logs, incident reports, meal charts.
- `diary:create` — Write daily diary shift notes and behavioral observations.

### 2.7 Facilities & Rooms
- `facility:read` — View building wards, rooms, and bed occupancy.
- `facility:manage` — Add rooms, reconfigure beds, assign resident to bed.

### 2.8 Visitors
- `visitor:read` — View visitor registry and log history.
- `visitor:log` — Check-in and check-out visitors.

### 2.9 Documents & Compliance
- `document:read` — View resident IDs, medical scans, death certificates.
- `document:upload` — Upload documents to private S3 folder.
- `document:delete` — Remove documents from archive.

### 2.10 Donations & Financial Operations
- `finance:donation:read` — View donor lists and contribution records.
- `finance:donation:create` — Record incoming donation and issue 80G tax receipt.
- `finance:expense:read` — View operational expenses, groceries, medical bills.
- `finance:expense:create` — Submit or approve expense receipts.
- `finance:report:generate` — Generate financial statements and audit balance sheets.

### 2.11 Family Member Portal (Restricted)
- `family:resident:view_own` — View assigned relative's photos, vitals, daily updates.
- `family:message:send` — Send care messages to the ward supervisor.

---

## 3. Comprehensive Role-to-Permission Matrix

| Permission Code | Platform Super Admin | NGO Admin | Doctor | Nurse / Caretaker | Accountant | Staff | Volunteer | Family Member | Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`platform:*` (All)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`org:settings:*`** | ❌* | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁️ (Read) |
| **`org:subscription:*`**| ❌* | ✅ | ❌ | ❌ | 👁️ (Read) | ❌ | ❌ | ❌ | ❌ |
| **`org:member:*`** | ❌* | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁️ (Read) |
| **`org:audit:read`** | ❌* | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **`resident:read`** | ❌* | ✅ | ✅ | ✅ | 👁️ (Basic) | ✅ | 👁️ (Basic) | ❌ (Own only) | ✅ |
| **`resident:create`** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **`resident:update`** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **`resident:discharge`**| ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`rescue:*` (All)** | ❌ | ✅ | 👁️ (Read) | 👁️ (Read) | ❌ | ✅ | ✅ | ❌ | 👁️ (Read) |
| **`medical:record:read`**| ❌* | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **`medical:record:write`**| ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`medical:vitals:read`** | ❌* | ✅ | ✅ | ✅ | ❌ | 👁️ (Basic) | ❌ | ❌ | ✅ |
| **`medical:vitals:create`**| ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`medical:prescription:create`**| ❌| ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`medical:schedule:administer`**| ❌| ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`attendance:*`** | ❌ | ✅ | 👁️ (Read) | ✅ | 👁️ (Read) | ✅ | 👁️ (Read) | ❌ | 👁️ (Read) |
| **`diary:*`** | ❌ | ✅ | 👁️ (Read) | ✅ | ❌ | ✅ | 👁️ (Read) | ❌ | 👁️ (Read) |
| **`facility:*`** | ❌ | ✅ | 👁️ (Read) | 👁️ (Read) | ❌ | ✅ | ❌ | ❌ | 👁️ (Read) |
| **`visitor:*`** | ❌ | ✅ | 👁️ (Read) | 👁️ (Read) | ❌ | ✅ | ✅ | ❌ | 👁️ (Read) |
| **`document:*`** | ❌* | ✅ | 👁️ (Medical) | 👁️ (Medical) | 👁️ (Bills) | ✅ | ❌ | ❌ | 👁️ (Read) |
| **`finance:donation:*`** | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 👁️ (Read) |
| **`finance:expense:*`** | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 👁️ (Read) |
| **`family:resident:view_own`**| ❌| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

*\*Note: Platform Super Admins do not possess read permissions inside tenant workspaces by default, enforcing privacy-by-design.*

---

## 4. Privilege Escalation Defense Rules

1. **Hierarchy Ceiling:** An NGO Administrator can only grant permissions that exist within the tenant role catalog. They can **never** assign the `platform_super_admin` role.
2. **Context Binding:** A user cannot send `organization_id` in API request bodies to switch scope. The `organization_id` is derived **exclusively** from the authenticated JWT session or verified tenant subdomain.
3. **Multi-Membership Role Isolation:** If User A is an `admin` at *NGO Alpha* and a `family_member` at *NGO Beta*, their active JWT carries their specific role for the currently selected tenant. Switching active tenant requires re-minting a scoped session token.
4. **Prescription Integrity:** Only verified medical practitioners with active license numbers logged in their profile and assigned the `doctor` role may write to `prescriptions`.
5. **Immutable Financial Audit Trail:** Financial records (`donations`, `expenses`) cannot be permanently deleted. Only adjusting entries or voids with explicit audit log notes are permitted.

---

## 5. Session Token Claims Specification

When a user authenticates and enters an NGO workspace, their JWT contains:

```json
{
  "sub": "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "email": "doctor.sharma@sriseva.org",
  "name": "Dr. Ramesh Sharma",
  "is_platform_admin": false,
  "org_id": "org_550e8400-e29b-41d4-a716-446655440000",
  "org_slug": "sriseva",
  "role": "doctor",
  "branch_id": "brn_110e8400-e29b-41d4-a716-446655440001",
  "permissions": [
    "resident:read",
    "medical:record:read",
    "medical:record:write",
    "medical:vitals:read",
    "medical:vitals:create",
    "medical:prescription:read",
    "medical:prescription:create",
    "medical:schedule:administer",
    "facility:read"
  ],
  "iat": 1794690000,
  "exp": 1794776400
}
```

This ensures fast, stateless authorization checks in Next.js middleware and route handlers without querying the database on every micro-request.
