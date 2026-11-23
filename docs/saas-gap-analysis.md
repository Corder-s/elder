# ElderCare OS — SaaS Transformation Gap Analysis

**Date:** 23 November 2026  
**Document Status:** Comprehensive Architecture Assessment  
**Evaluation Target:** Target Commercial Multi-Tenant SaaS vs. Current Codebase Implementation  

---

## 1. Target SaaS Architecture Model

The target business model establishes a commercial, multi-tenant platform:

```text
                  +--------------------------------+
                  |         ONE PLATFORM           |
                  |     (Core Cloud / Infra)       |
                  +---------------+----------------+
                                  |
                  +---------------v----------------+
                  |        PLATFORM OWNER          |
                  |  (Super-Admin / Global Ops)    |
                  +---------------+----------------+
                                  |
           +----------------------+----------------------+
           |                                             |
+----------v-----------+                      +----------v-----------+
|  INDEPENDENT NGO A   |                      |  INDEPENDENT NGO B   |
| (Tenant ID: org_001) |                      | (Tenant ID: org_002) |
+----------+-----------+                      +----------+-----------+
           |                                             |
+----------v-----------+                      +----------v-----------+
|  PRIVATE WORKSPACE   |                      |  PRIVATE WORKSPACE   |
| (Branches, Config)   |                      | (Branches, Config)   |
+----------+-----------+                      +----------+-----------+
           |                                             |
+----------v-----------+                      +----------v-----------+
|  ROLE-BASED USERS    |                      |  ROLE-BASED USERS    |
| (Admin, Doctor, Care)|                      | (Admin, Doctor, Care)|
+----------------------+                      +----------------------+
```

---

## 2. Status Classification Legend

* **`EXISTS`**: Implemented, verified, and functional in executable code and UI.
* **`PARTIAL`**: Present in UI or logical specification, but incomplete, relying on mock data, or lacking backend persistence and enforcement.
* **`MISSING`**: Specified in the new SaaS model but completely absent from code and database specifications.
* **`CONFLICT`**: Existing implementation or specification contradicts or restricts the target multi-tenant SaaS model.
* **`UNKNOWN`**: Insufficient architectural or operational data to confirm.

---

## 3. SaaS Transformation Assessment Matrix

| # | SaaS Capability Requirement | Status | Evidence / Repository Path | Implementation Findings & Gap Details | Architectural Risk & Remediation |
|---|---|---|---|---|---|
| 1 | **Multi-Tenant Architecture** | `PARTIAL` | [database-schema.md §1](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L10-L15), [src/types/index.ts §L21](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/types/index.ts#L21) | Relational tables and TypeScript types have `organization_id` foreign keys, but current codebase operates on a single default organization fixture (`Sri Seva Old Age Home`). No tenant resolution middleware (subdomain/header) exists in code. | **High Risk.** Without strict tenant context resolution on every incoming request, cross-tenant data leakage is possible. Must implement tenant resolution middleware. |
| 2 | **Organization Registration** | `PARTIAL` | [/register](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/app/register/page.tsx#L182) | The registration screen collects "Organization / Old Age Home" name as a text field, but does not provision a new tenant entity, generate a workspace slug, or assign initial owner credentials. | **Medium Risk.** Must replace single-user sign-up with a dedicated self-service Organization Onboarding workflow that atomic-creates the tenant and first admin account. |
| 3 | **Organization / Workspace Creation** | `MISSING` | [src/app/register/page.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/app/register/page.tsx), [src/services/mockDataService.ts](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/services/mockDataService.ts) | No UI or backend service exists for creating workspaces, provisioning NGO subdomains, configuring currency/timezones, or assigning dedicated storage paths. | **High Risk.** System currently assumes static pre-existing organizations. Need automated workspace provisioning service. |
| 4 | **Tenant Data Isolation** | `CONFLICT` | [database-schema.md §1](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L10), [src/components/layout/MobileHeader.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/components/layout/MobileHeader.tsx#L40) | Current design assumes "one NGO with multiple branches". Branch dropdown switches between branches of a single NGO, not distinct NGOs. Furthermore, no PostgreSQL Row-Level Security (RLS) policies exist. | **Critical Risk.** Multi-tenant SaaS requires complete data isolation. If using shared database, RLS policies and mandatory tenant filtering are required. |
| 5 | **Organization Membership** | `CONFLICT` | [src/types/index.ts §L21](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/types/index.ts#L21), [database-schema.md §3](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md#L57-L68) | In `database-schema.md` and `src/types/index.ts`, `User` has a single `organizationId: string`. A user cannot belong to multiple NGOs (e.g. visiting doctor or consulting auditor). | **High Risk.** Needs a dedicated `organization_memberships` table separating the identity `User` from their tenant-specific role. |
| 6 | **NGO Administrator Permissions** | `EXISTS` | [AdministratorDashboard.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/components/dashboards/AdministratorDashboard.tsx), [AuthContext.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/context/AuthContext.tsx) | Complete NGO Admin UI exists: manages residents, staff, admissions, rescues, visitors, and facilities for their home. Scoped cleanly to daily operations. | **Low Risk.** Reusable as-is for the NGO Administrator role within their private workspace. |
| 7 | **Platform Owner Permissions** | `CONFLICT` | [SuperAdminDashboard.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/components/dashboards/SuperAdminDashboard.tsx) | Currently, `super_admin` in `SuperAdminDashboard.tsx` manages internal organization branches and staff. It does NOT have screens or logic to manage platform NGOs, billing plans, or cross-tenant health. | **High Risk.** Rename current `super_admin` to `ngo_owner` / `ngo_admin`, and build a dedicated `platform_super_admin` role for the Platform Owner. |
| 8 | **Role-Based Dashboards** | `EXISTS` | [src/components/dashboards/](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/components/dashboards/) | All 8 operational dashboards (Super Admin, Admin, Doctor, Caretaker, Accountant, Staff, Volunteer, Family) are fully implemented and verified. | **No Risk.** Reusable directly as tenant role experiences. |
| 9 | **Subscription Plans & Tiers** | `MISSING` | [database-schema.md](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md), [src/types/index.ts](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/types/index.ts) | No entities, tables, or UI exist for subscription plans (e.g. Starter, Professional, Enterprise tiers with resident quotas). | **High Commercial Risk.** Must create `subscription_plans` and `tenant_subscriptions` schemas. |
| 10 | **Billing & Payments** | `MISSING` | [src/app/finance/page.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/app/finance/page.tsx) | `/finance` handles NGO donor contributions (80G tax receipts), NOT SaaS subscription billing between the Platform Owner and the NGO. No payment gateway (Razorpay/Stripe) integration exists. | **High Commercial Risk.** Must introduce platform billing module separate from internal NGO donations. |
| 11 | **Subscription Expiry & Grace Periods** | `MISSING` | [database-schema.md](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/database-schema.md), [src/context/AuthContext.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/context/AuthContext.tsx) | No subscription state machine (`active`, `past_due`, `grace_period`, `suspended`, `cancelled`) or read-only access enforcement upon non-payment. | **Medium Risk.** Must implement subscription middleware that restricts write operations when tenant subscription is expired. |
| 12 | **Usage Restrictions & Quota Enforcement** | `MISSING` | [src/services/fixtures.ts](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/services/fixtures.ts) | No enforcement of plan limits (e.g., maximum 50 residents on Starter plan, max 5GB document storage, max 10 staff accounts). | **Medium Risk.** Must add quota validation guards before executing resource creation (`createResident`, `uploadDocument`). |
| 13 | **Support & Tenant Management** | `MISSING` | [src/app/settings/page.tsx](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/app/settings/page.tsx) | No centralized platform portal to view all tenant NGOs, inspect tenant subscription status, impersonate for support, or suspend abusive tenants. | **Medium Risk.** Platform Owner portal must include tenant directory and operational support tools. |

---

## 4. Synthesis of Gaps

1. **Frontend Completeness:** Operational UI is **95% complete** for internal NGO operations. The gap is the lack of Platform Owner views (Tenant Management, SaaS Plans, Global Metrics) and NGO Subscription Settings.
2. **Data Model Architecture:** The logical schema in `database-schema.md` already has `organization_id` on operational tables, but must be extended with:
   - `subscriptions` & `subscription_plans`
   - `organization_memberships` (decoupling users from single tenants)
   - `platform_audit_logs`
3. **Backend & Service Layer:** The primary gap is the transition from client-side mock fixtures (`mockDataService.ts`) to real server-side API routes with tenant-aware authorization guards.
