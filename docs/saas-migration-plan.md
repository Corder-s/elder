# ElderCare OS — SaaS Migration Plan (Non-Destructive Evolution)

**Date:** 23 November 2026  
**Document Status:** Architecture Plan  
**Target:** Evolution to Commercial Multi-Tenant SaaS Platform  

---

## 1. Guiding Principles & Non-Negotiable Constraints

1. **Zero Rebuilding:** The existing Next.js 15 App Router frontend, 25 application routes, 8 role dashboards, and purple design system (`#6D28D9`) will be preserved in full.
2. **Preserve Working Business Logic:** Existing operational workflows (Rescue $\rightarrow$ Admission $\rightarrow$ Room/Bed Allocation $\rightarrow$ Care) remain the core domain engine of each tenant workspace.
3. **Additive Schema Evolution:** Existing table structures defined in `database-schema.md` are preserved; new SaaS tables (`subscriptions`, `subscription_plans`, `organization_memberships`) are added without breaking foreign keys.
4. **Strict Tenant Scoping:** Every operational query is isolated by `organization_id` using PostgreSQL Row-Level Security (RLS) and repository middleware.
5. **No Disruption to Existing Data:** All existing test fixtures and mock records are migrated cleanly into a default initial tenant (`Sri Seva Old Age Home`, UUID: `11111111-1111-1111-1111-111111111111`).

---

## 2. Multi-Tenant Architectural Model

```text
+--------------------------------------------------------------------------+
|                              ELDERCARE OS                                |
|                        (Single SaaS Deployment)                          |
+--------------------------------------------------------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
+--------------v---------------+            +--------------v---------------+
|    PLATFORM OWNER CONTEXT    |            |     TENANT WORKSPACE CONTEXT |
| (Platform Admin, SaaS Plans, |            | (NGOs: Sri Seva, Vrindavan..) |
|  Tenant Billing, Global Logs)|            | (Residents, Medical, Staff)  |
+------------------------------+            +------------------------------+
                                                           |
                                            +--------------v---------------+
                                            |      TENANT RESOLUTION       |
                                            | 1. Subdomain: org.eldercare  |
                                            | 2. Header: x-organization-id |
                                            | 3. Session: active_tenant_id |
                                            +--------------+---------------+
                                                           |
                                            +--------------v---------------+
                                            |   POSTGRESQL RLS ENFORCEMENT |
                                            |  SET LOCAL app.current_org = |
                                            +------------------------------+
```

---

## 3. Database Schema Extensions (Additive)

To support the commercial SaaS model, the following schemas are introduced alongside the existing tables in `database-schema.md`:

### 3.1 Subscription Plans (`subscription_plans`)
```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- 'starter', 'professional', 'enterprise'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_inr NUMERIC(10, 2) NOT NULL,
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'annual'
    max_residents INT NOT NULL,       -- e.g. 50, 150, 500
    max_staff_accounts INT NOT NULL,  -- e.g. 5, 25, 100
    max_storage_gb INT NOT NULL,      -- e.g. 5, 50, 200
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 Tenant Subscriptions (`tenant_subscriptions`)
```sql
CREATE TABLE tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'trial', 'active', 'past_due', 'grace_period', 'suspended', 'cancelled'
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    grace_period_ends_at TIMESTAMPTZ,
    payment_provider VARCHAR(50), -- 'razorpay', 'stripe', 'offline_cheque'
    provider_subscription_id VARCHAR(200),
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.3 Decoupled User Memberships (`organization_memberships`)
Decouples a single user login from being hardcoded to one NGO:
```sql
CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'invited', 'suspended'
    is_primary BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, organization_id)
);
```

---

## 4. Tenant Data Isolation & Row-Level Security (RLS)

To eliminate cross-tenant data leakage while using a single high-performance PostgreSQL 18 instance:

1. **Session Context Setting:** Every database connection executing a request sets a session variable:
   ```sql
   SET LOCAL app.current_organization_id = '11111111-1111-1111-1111-111111111111';
   ```
2. **Row-Level Security Policy on All Operational Tables:**
   ```sql
   ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY tenant_isolation_policy ON residents
       FOR ALL
       USING (
           organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
           OR current_setting('app.is_platform_super_admin', true) = 'true'
       );
   ```
3. Applied to: `residents`, `admissions`, `rescue_cases`, `medical_records`, `prescriptions`, `attendance`, `visitors`, `documents`, `donations`, `expenses`, `rooms`, `beds`, `tasks`, `daily_diary`.

---

## 5. Phased Evolution Roadmap

```text
Phase 1: Database & Tenant Schema Initialization
         ├── Instantiate PostgreSQL 18 DDL with RLS policies
         ├── Seed Default Tenant ('Sri Seva Old Age Home')
         └── Seed Default Subscription Plans (Starter, Pro, Enterprise)

Phase 2: Tenant Context & Auth Integration
         ├── Add Tenant Resolution Middleware (header / cookie / subdomain)
         ├── Extend Next.js AuthContext with activeWorkspace state
         └── Connect Server Actions / Route Handlers to RLS context

Phase 3: Organization Self-Service Onboarding
         ├── Transform /register into 3-step Organization Setup wizard
         ├── Generate unique NGO workspace slug (e.g. sriseva.eldercareos.com)
         └── Provision trial subscription automatically

Phase 4: Platform Owner Portal (Commercial Operations)
         ├── Introduce /platform-admin route (Platform Super-Admin only)
         ├── Global NGO directory & health metrics
         └── Tenant subscription management & feature toggle controls

Phase 5: Billing & Quota Enforcement
         ├── Integrate Razorpay / Stripe Webhooks for recurring billing
         ├── Add Pre-Save Quota Checks (max residents, storage size)
         └── Grace period & read-only access lock on subscription expiry
```

---

## 6. Migration of Existing Mock & Fixture Records

Existing records in `src/services/fixtures.ts` represent a fully functional old-age home (`Sri Seva Old Age Home`). The migration pipeline:

1. Seed `organizations` table with:
   - `id`: `11111111-1111-1111-1111-111111111111`
   - `name`: `Sri Seva Old Age Home`
   - `slug`: `sri-seva`
2. Seed `tenant_subscriptions` with an `enterprise` plan (Active status).
3. Assign all existing fixture residents, staff, admissions, and rescue cases to `organization_id = '11111111-1111-1111-1111-111111111111'`.
4. This ensures existing UI screens, demo roles, and verified flows work seamlessly without data disruption.

---

## 7. Migration Risks & Mitigation Strategy

| Risk Scenario | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Accidental Cross-Tenant Leakage** | Critical | Enforce PostgreSQL Row-Level Security at DB engine level; database rejects queries without tenant context even if application code fails. |
| **Breaking Existing Frontend Pages** | High | Keep `src/types/index.ts` backward-compatible. Add `tenantId` aliases where necessary so no UI component breaks. |
| **Complex Subdomain Routing on Localhost** | Medium | Support dual resolution: Subdomain in production (`org.eldercare.com`), `x-organization-id` header / cookie in local development. |
| **Non-Payment Service Disruption** | Medium | Implement soft grace period (14 days) where system enters **read-only mode** allowing staff to view resident medical charts without interruption. |
