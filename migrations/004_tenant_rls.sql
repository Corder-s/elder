-- Migration 004: Native PostgreSQL Row-Level Security (RLS)
-- Mandate: Strict fail-closed tenant isolation.
-- No app.is_platform_admin bypass in tenant tables.

-- List of all 22 tenant-scoped tables:
-- branches, roles, organization_memberships, invitations, tenant_subscriptions,
-- subscription_invoices, usage_records, residents, rescue_cases, admissions,
-- medical_records, medical_observations, prescriptions, medication_schedules,
-- attendance, rooms, beds, visitors, visits, documents, donations, expenses,
-- tasks, daily_diary, events, tenant_audit_logs.

-- Macro procedure to enable and apply standard tenant isolation policy
DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'branches',
        'roles',
        'organization_memberships',
        'invitations',
        'tenant_subscriptions',
        'subscription_invoices',
        'usage_records',
        'residents',
        'rescue_cases',
        'admissions',
        'medical_records',
        'medical_observations',
        'prescriptions',
        'medication_schedules',
        'attendance',
        'rooms',
        'beds',
        'visitors',
        'visits',
        'documents',
        'donations',
        'expenses',
        'tasks',
        'daily_diary',
        'events',
        'tenant_audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

        -- Drop existing policy if present
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);

        -- Create strict fail-closed isolation policy
        -- Validates against transaction-scoped variable app.current_organization_id
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %I
             FOR ALL
             USING (
                 organization_id = NULLIF(current_setting(''app.current_organization_id'', true), '''')::uuid
             )
             WITH CHECK (
                 organization_id = NULLIF(current_setting(''app.current_organization_id'', true), '''')::uuid
             );',
            tbl
        );
    END LOOP;
END $$;
