-- Migration 010: Stage 3B-5 Operational Modules RBAC Permissions, Additive Columns & Performance Indexes
-- Strict Compliance: Additive, Non-Destructive, Preserves All Existing Data & Migrations

BEGIN;

-- ============================================================================
-- 1. SEED ADDITIONAL GRANULAR PERMISSIONS FOR EVENTS, TASKS, DIARY, EXPENSES, REPORTS
-- ============================================================================
INSERT INTO permissions (code, name, domain, description) VALUES
('event:read', 'View Events', 'care', 'View organization events and calendar'),
('event:manage', 'Manage Events', 'care', 'Create, update, and cancel events'),
('task:read', 'View Tasks', 'care', 'View tasks and reminders'),
('task:create', 'Create Tasks', 'care', 'Create and assign tasks'),
('task:update', 'Update Tasks', 'care', 'Update task status and details'),
('task:assign', 'Assign Tasks', 'care', 'Assign or reassign tasks to organization members'),
('diary:update', 'Edit Daily Diary', 'care', 'Edit own daily care diary entries'),
('finance:expense:approve', 'Approve Expenses', 'finance', 'Approve or reject NGO expense vouchers'),
('report:read', 'View Operational Reports', 'organization', 'View aggregated NGO operational analytics')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. ASSIGN NEW PERMISSIONS TO EXISTING SYSTEM ROLES ACROSS ALL ORGANIZATIONS
-- ============================================================================
-- Admin gets all new operational permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'admin'
  AND p.code IN (
    'event:read', 'event:manage',
    'task:read', 'task:create', 'task:update', 'task:assign',
    'diary:update', 'finance:expense:approve', 'report:read'
  )
ON CONFLICT DO NOTHING;

-- Staff gets event, task, diary update, and report read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'staff'
  AND p.code IN ('event:read', 'event:manage', 'task:read', 'task:create', 'task:update', 'diary:update')
ON CONFLICT DO NOTHING;

-- Doctor & Nurse get event read, task read/create/update, diary update, report read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug IN ('doctor', 'nurse')
  AND p.code IN ('event:read', 'task:read', 'task:create', 'task:update', 'diary:update', 'report:read')
ON CONFLICT DO NOTHING;

-- Accountant gets expense approve, task read/update, event read, report read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'accountant'
  AND p.code IN ('event:read', 'task:read', 'task:update', 'finance:expense:approve', 'report:read')
ON CONFLICT DO NOTHING;

-- Volunteer gets event read, task read/update
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'volunteer'
  AND p.code IN ('event:read', 'task:read', 'task:update')
ON CONFLICT DO NOTHING;

-- Auditor gets read-only event, task, report permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'auditor'
  AND p.code IN ('event:read', 'task:read', 'report:read')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. ADDITIVE COLUMNS & CONSTRAINTS ON OPERATIONAL TABLES
-- ============================================================================
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE daily_diary
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';

-- Ensure a resident cannot occupy two beds simultaneously at the database level
CREATE UNIQUE INDEX IF NOT EXISTS uq_beds_active_resident
    ON beds(organization_id, current_resident_id)
    WHERE current_resident_id IS NOT NULL;

-- ============================================================================
-- 4. PERFORMANCE INDEXES FOR OPERATIONAL QUERIES & REPORTS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_rescue_org_status ON rescue_cases(organization_id, status, urgency_level);
CREATE INDEX IF NOT EXISTS idx_prescriptions_org_res ON prescriptions(organization_id, resident_id, is_active);
CREATE INDEX IF NOT EXISTS idx_med_sched_org_status ON medication_schedules(organization_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_beds_org_room ON beds(organization_id, room_id, status);
CREATE INDEX IF NOT EXISTS idx_visits_org_checkin ON visits(organization_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(organization_id, status, assigned_to);
CREATE INDEX IF NOT EXISTS idx_diary_org_date ON daily_diary(organization_id, entry_date DESC, shift);
CREATE INDEX IF NOT EXISTS idx_events_org_start ON events(organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses(organization_id, incurred_date DESC);

-- ============================================================================
-- 5. UPDATE PROVISIONING STORED PROCEDURE SO NEW NGOs RECEIVE NEW PERMISSIONS
-- ============================================================================
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
    SELECT id INTO v_plan_id FROM subscription_plans WHERE slug = p_plan_slug;
    IF v_plan_id IS NULL THEN
        SELECT id INTO v_plan_id FROM subscription_plans WHERE slug = 'starter';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_user_id) THEN
        RAISE EXCEPTION 'Admin user % does not exist', p_admin_user_id;
    END IF;

    INSERT INTO organizations (
        name, slug, primary_email, primary_phone, status, trial_ends_at
    ) VALUES (
        p_org_name, lower(trim(p_org_slug)), lower(trim(p_primary_email)), trim(p_primary_phone),
        'trial', CURRENT_TIMESTAMP + INTERVAL '14 days'
    )
    RETURNING id INTO v_org_id;

    PERFORM set_config('app.current_organization_id', v_org_id::text, true);

    INSERT INTO branches (organization_id, name, code, is_main_branch, status)
    VALUES (v_org_id, p_branch_name, 'HQ-01', true, 'active')
    RETURNING id INTO v_branch_id;

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

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM permissions
    WHERE domain IN ('organization', 'resident', 'rescue', 'care', 'facility', 'visitor', 'document', 'finance')
       OR code IN ('medical:record:read', 'medical:vitals:read', 'medical:prescription:read');

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_doctor_role_id, id FROM permissions
    WHERE domain = 'medical'
       OR code IN ('resident:read', 'rescue:read', 'facility:read', 'document:read', 'attendance:read',
                   'event:read', 'task:read', 'task:create', 'task:update', 'diary:update', 'report:read');

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_nurse_role_id, id FROM permissions
    WHERE code IN (
        'resident:read', 'medical:record:read', 'medical:vitals:read', 'medical:vitals:create',
        'medical:prescription:read', 'medical:schedule:administer', 'attendance:read',
        'attendance:mark', 'diary:read', 'diary:create', 'diary:update', 'facility:read', 'visitor:read',
        'event:read', 'task:read', 'task:create', 'task:update', 'report:read'
    );

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_accountant_role_id, id FROM permissions
    WHERE domain = 'finance'
       OR code IN ('resident:read', 'org:subscription:read', 'document:read',
                   'event:read', 'task:read', 'task:update', 'report:read');

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_staff_role_id, id FROM permissions
    WHERE code IN (
        'resident:read', 'resident:create', 'resident:update', 'rescue:read', 'rescue:create',
        'rescue:update', 'attendance:read', 'attendance:mark', 'diary:read', 'diary:create', 'diary:update',
        'facility:read', 'visitor:read', 'visitor:log', 'document:read', 'document:upload',
        'event:read', 'event:manage', 'task:read', 'task:create', 'task:update'
    );

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_volunteer_role_id, id FROM permissions
    WHERE code IN ('resident:read', 'rescue:read', 'rescue:create', 'visitor:log', 'diary:read',
                   'event:read', 'task:read', 'task:update');

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_family_role_id, id FROM permissions
    WHERE code = 'family:resident:view_own';

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_auditor_role_id, id FROM permissions
    WHERE code IN ('resident:read', 'org:audit:read', 'finance:donation:read', 'finance:expense:read',
                   'document:read', 'event:read', 'task:read', 'report:read');

    INSERT INTO organization_memberships (
        user_id, organization_id, role_id, branch_id, title, status
    ) VALUES (
        p_admin_user_id, v_org_id, v_admin_role_id, v_branch_id, 'Executive Director / Admin', 'active'
    );

    INSERT INTO tenant_subscriptions (
        organization_id, plan_id, status, billing_interval,
        current_period_start, current_period_end, trial_start, trial_end
    ) VALUES (
        v_org_id, v_plan_id, 'trial', 'monthly',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days'
    );

    INSERT INTO usage_records (organization_id, metric_name, metric_value)
    VALUES
        (v_org_id, 'residents_count', 0),
        (v_org_id, 'staff_count', 1),
        (v_org_id, 'branches_count', 1),
        (v_org_id, 'storage_bytes', 0);

    INSERT INTO platform_audit_logs (
        actor_user_id, target_organization_id, action, resource_type, resource_id, details
    ) VALUES (
        p_admin_user_id, v_org_id, 'organization_provisioned', 'organization', v_org_id::text,
        jsonb_build_object('slug', p_org_slug, 'plan', p_plan_slug)
    );

    RETURN v_org_id;
END;
$$;

COMMIT;
