-- Migration 006: Stored Procedure for Dynamic Multi-Tenant Workspace Provisioning
-- Strict Security: SECURITY DEFINER with fixed search_path = public, pg_temp

CREATE OR REPLACE FUNCTION provision_new_ngo_workspace(
    p_org_name VARCHAR(255),
    p_org_slug VARCHAR(63),
    p_primary_email VARCHAR(255),
    p_primary_phone VARCHAR(50),
    p_admin_user_id UUID,
    p_plan_slug VARCHAR(50) DEFAULT 'starter',
    p_branch_name VARCHAR(255) DEFAULT 'Main Facility'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_org_id UUID;
    v_branch_id UUID;
    v_plan_id UUID;
    v_admin_role_id UUID;
    v_doctor_role_id UUID;
    v_nurse_role_id UUID;
    v_accountant_role_id UUID;
    v_staff_role_id UUID;
    v_volunteer_role_id UUID;
    v_family_role_id UUID;
    v_auditor_role_id UUID;
BEGIN
    -- 1. Validate plan exists
    SELECT id INTO v_plan_id FROM subscription_plans WHERE slug = p_plan_slug;
    IF v_plan_id IS NULL THEN
        SELECT id INTO v_plan_id FROM subscription_plans WHERE slug = 'starter';
    END IF;

    -- 2. Validate admin user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_user_id) THEN
        RAISE EXCEPTION 'Admin user % does not exist', p_admin_user_id;
    END IF;

    -- 3. Create Organization
    INSERT INTO organizations (
        name, slug, primary_email, primary_phone, status, trial_ends_at
    ) VALUES (
        p_org_name,
        lower(trim(p_org_slug)),
        lower(trim(p_primary_email)),
        trim(p_primary_phone),
        'trial',
        CURRENT_TIMESTAMP + INTERVAL '14 days'
    )
    RETURNING id INTO v_org_id;

    -- Temporarily set context so RLS permits insertion into tenant-scoped tables
    PERFORM set_config('app.current_organization_id', v_org_id::text, true);

    -- 4. Create Default Main Branch
    INSERT INTO branches (
        organization_id, name, code, is_main_branch, status
    ) VALUES (
        v_org_id,
        p_branch_name,
        'HQ-01',
        true,
        'active'
    )
    RETURNING id INTO v_branch_id;

    -- 5. Create Tenant Standard Roles
    INSERT INTO roles (organization_id, name, slug, description, is_system_role)
    VALUES (v_org_id, 'NGO Administrator', 'admin', 'Full control over home operations, members, and settings', true)
    RETURNING id INTO v_admin_role_id;

    INSERT INTO roles (organization_id, name, slug, description, is_system_role)
    VALUES (v_org_id, 'Medical Doctor', 'doctor', 'Clinical management, diagnoses, and medical prescriptions', true)
    RETURNING id INTO v_doctor_role_id;

    INSERT INTO roles (organization_id, name, slug, description, is_system_role)
    VALUES (v_org_id, 'Nurse / Caretaker', 'nurse', 'Daily resident care, vitals tracking, and medication administration', true)
    RETURNING id INTO v_nurse_role_id;

    INSERT INTO roles (organization_id, name, slug, description, is_system_role)
    VALUES (v_org_id, 'Accountant', 'accountant', 'Donation management, 80G receipts, and expense vouchers', true)
    RETURNING id INTO v_accountant_role_id;

    INSERT INTO roles (organization_id, name, slug, description, is_system_role)
    VALUES (v_org_id, 'Staff Member', 'staff', 'General facility, admission, and rescue operations', true)
    RETURNING id INTO v_staff_role_id;

    INSERT INTO roles (organization_id, name, slug, description, is_system_role)
    VALUES (v_org_id, 'Volunteer', 'volunteer', 'Activity support, visits, and event assistance', true)
    RETURNING id INTO v_volunteer_role_id;

    INSERT INTO roles (organization_id, name, slug, description, is_system_role)
    VALUES (v_org_id, 'Family Member', 'family_member', 'Restricted access to assigned relative updates', true)
    RETURNING id INTO v_family_role_id;

    INSERT INTO roles (organization_id, name, slug, description, is_system_role)
    VALUES (v_org_id, 'Auditor', 'auditor', 'Read-only compliance and financial inspection', true)
    RETURNING id INTO v_auditor_role_id;

    -- 6. Assign Permissions to Admin Role (All organization, care, medical read, and finance permissions)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM permissions
    WHERE domain IN ('organization', 'resident', 'rescue', 'care', 'facility', 'visitor', 'document', 'finance')
       OR code IN ('medical:record:read', 'medical:vitals:read', 'medical:prescription:read');

    -- Assign Permissions to Doctor Role
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_doctor_role_id, id FROM permissions
    WHERE domain = 'medical'
       OR code IN ('resident:read', 'rescue:read', 'facility:read', 'document:read', 'attendance:read');

    -- Assign Permissions to Nurse Role
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_nurse_role_id, id FROM permissions
    WHERE code IN (
        'resident:read', 'medical:record:read', 'medical:vitals:read', 'medical:vitals:create',
        'medical:prescription:read', 'medical:schedule:administer', 'attendance:read',
        'attendance:mark', 'diary:read', 'diary:create', 'facility:read', 'visitor:read'
    );

    -- Assign Permissions to Accountant Role
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_accountant_role_id, id FROM permissions
    WHERE domain = 'finance'
       OR code IN ('resident:read', 'org:subscription:read', 'document:read');

    -- Assign Permissions to Staff Role
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_staff_role_id, id FROM permissions
    WHERE code IN (
        'resident:read', 'resident:create', 'resident:update', 'rescue:read', 'rescue:create',
        'rescue:update', 'attendance:read', 'attendance:mark', 'diary:read', 'diary:create',
        'facility:read', 'visitor:read', 'visitor:log', 'document:read', 'document:upload'
    );

    -- Assign Permissions to Volunteer Role
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_volunteer_role_id, id FROM permissions
    WHERE code IN ('resident:read', 'rescue:read', 'rescue:create', 'visitor:log', 'diary:read');

    -- Assign Permissions to Family Role
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_family_role_id, id FROM permissions
    WHERE code = 'family:resident:view_own';

    -- 7. Add Admin User to Organization Membership
    INSERT INTO organization_memberships (
        user_id, organization_id, role_id, branch_id, title, status
    ) VALUES (
        p_admin_user_id,
        v_org_id,
        v_admin_role_id,
        v_branch_id,
        'Executive Director / Admin',
        'active'
    );

    -- 8. Provision Initial 14-Day Trial Subscription
    INSERT INTO tenant_subscriptions (
        organization_id, plan_id, status, billing_interval,
        current_period_start, current_period_end, trial_start, trial_end
    ) VALUES (
        v_org_id,
        v_plan_id,
        'trial',
        'monthly',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '14 days',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '14 days'
    );

    -- 9. Initialize Usage Records
    INSERT INTO usage_records (organization_id, metric_name, metric_value)
    VALUES
        (v_org_id, 'residents_count', 0),
        (v_org_id, 'staff_count', 1),
        (v_org_id, 'branches_count', 1),
        (v_org_id, 'storage_bytes', 0);

    -- 10. Log to Platform Audit Logs
    INSERT INTO platform_audit_logs (
        actor_user_id, target_organization_id, action, resource_type, resource_id, details
    ) VALUES (
        p_admin_user_id,
        v_org_id,
        'workspace_provisioned',
        'organization',
        v_org_id::text,
        jsonb_build_object('name', p_org_name, 'slug', p_org_slug, 'plan', p_plan_slug)
    );

    RETURN v_org_id;
END;
$$;
