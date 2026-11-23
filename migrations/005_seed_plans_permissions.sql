-- Migration 005: Seed Commercial Subscription Plans, Granular Permissions, and System Roles

-- 1. Subscription Plans
INSERT INTO subscription_plans (
    name, slug, description, price_monthly_inr, price_annual_inr,
    resident_limit, staff_limit, branch_limit, storage_limit_mb, features
) VALUES
(
    'Starter',
    'starter',
    'Ideal for small hospice homes and single-location elderly care shelters.',
    2999.00,
    29990.00,
    30,
    5,
    1,
    5120, -- 5 GB
    '{"custom_branding": false, "api_access": false, "audit_export": false, "advanced_reports": false}'::jsonb
),
(
    'Professional',
    'professional',
    'Designed for established NGOs with multiple wards and expanding rescue activities.',
    7999.00,
    79990.00,
    100,
    25,
    3,
    25600, -- 25 GB
    '{"custom_branding": true, "api_access": false, "audit_export": true, "advanced_reports": true}'::jsonb
),
(
    'Enterprise',
    'enterprise',
    'Comprehensive multi-facility management for charitable trusts and state networks.',
    19999.00,
    199990.00,
    500,
    1000, -- Unlimited staff
    999,  -- Unlimited branches
    102400, -- 100 GB
    '{"custom_branding": true, "api_access": true, "audit_export": true, "advanced_reports": true, "priority_support": true}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
    price_monthly_inr = EXCLUDED.price_monthly_inr,
    price_annual_inr = EXCLUDED.price_annual_inr,
    resident_limit = EXCLUDED.resident_limit,
    staff_limit = EXCLUDED.staff_limit,
    branch_limit = EXCLUDED.branch_limit,
    storage_limit_mb = EXCLUDED.storage_limit_mb,
    features = EXCLUDED.features;

-- 2. Granular Permissions Catalog
INSERT INTO permissions (code, name, domain, description) VALUES
-- Platform Domain
('platform:org:create', 'Provision Workspace', 'platform', 'Ability to provision a new NGO workspace on the platform'),
('platform:org:read', 'View NGOs', 'platform', 'Ability to view registered NGOs and metadata'),
('platform:org:update', 'Update NGO Details', 'platform', 'Ability to update NGO status or quotas'),
('platform:org:suspend', 'Suspend NGO Workspace', 'platform', 'Ability to suspend an NGO workspace'),
('platform:plan:manage', 'Manage Subscription Plans', 'platform', 'Ability to create and update commercial pricing plans'),
('platform:billing:read', 'View SaaS Revenue', 'platform', 'Ability to monitor platform subscriptions and payment webhooks'),
('platform:audit:read', 'View Global Audit Logs', 'platform', 'Ability to view platform-wide administrative actions'),

-- Organization Administration Domain
('org:settings:read', 'View Settings', 'organization', 'View NGO profile, branch, and configuration'),
('org:settings:update', 'Update Settings', 'organization', 'Modify NGO details, branding, and preferences'),
('org:subscription:read', 'View Subscription', 'organization', 'View active plan, billing period, and past invoices'),
('org:subscription:manage', 'Manage Subscription', 'organization', 'Upgrade or cancel plan, update payment methods'),
('org:member:invite', 'Invite Team Members', 'organization', 'Invite staff, doctors, volunteers, or family members'),
('org:member:read', 'View Team Members', 'organization', 'View member roster and statuses'),
('org:member:update', 'Update Member Roles', 'organization', 'Change member roles and permissions'),
('org:member:deactivate', 'Remove Team Member', 'organization', 'Revoke member access to workspace'),
('org:audit:read', 'View Tenant Audit Log', 'organization', 'View operational action audit history'),

-- Resident Domain
('resident:read', 'View Residents', 'resident', 'View resident profiles and room assignments'),
('resident:create', 'Admit Resident', 'resident', 'Admit a new resident into the home'),
('resident:update', 'Update Resident', 'resident', 'Edit resident information and care details'),
('resident:discharge', 'Discharge Resident', 'resident', 'Process resident discharge, reunification, or demise'),
('resident:delete', 'Archive Resident', 'resident', 'Soft delete resident profile'),

-- Rescue Domain
('rescue:read', 'View Rescue Cases', 'rescue', 'View rescue case records and reports'),
('rescue:create', 'Log Rescue Case', 'rescue', 'Register new distress report or rescue case'),
('rescue:update', 'Update Rescue Case', 'rescue', 'Update investigation, medical transit, or notes'),
('rescue:convert', 'Convert to Resident', 'rescue', 'Approve rescue case and transition to resident admission'),

-- Clinical & Medical Domain
('medical:record:read', 'View Medical History', 'medical', 'Access clinical history, diagnoses, and doctor notes'),
('medical:record:write', 'Write Medical Notes', 'medical', 'Create clinical consultation records and diagnoses'),
('medical:vitals:read', 'View Health Vitals', 'medical', 'View blood pressure, pulse, glucose, and oxygen readings'),
('medical:vitals:create', 'Record Health Vitals', 'medical', 'Log daily vital observations'),
('medical:prescription:read', 'View Prescriptions', 'medical', 'View active and past prescription orders'),
('medical:prescription:create', 'Prescribe Medication', 'medical', 'Author and modify medical prescriptions (Doctor only)'),
('medical:schedule:administer', 'Administer Medicine', 'medical', 'Mark medicine dose as administered, missed, or refused'),

-- Attendance & Care Domain
('attendance:read', 'View Attendance', 'care', 'View resident daily attendance records'),
('attendance:mark', 'Record Attendance', 'care', 'Log daily roll call and status changes'),
('diary:read', 'Read Daily Diary', 'care', 'Read shift notes and daily home observations'),
('diary:create', 'Write Daily Diary', 'care', 'Create daily care journal entries and logs'),

-- Facility & Visitors Domain
('facility:read', 'View Facility', 'facility', 'View wards, rooms, and bed occupancy'),
('facility:manage', 'Manage Facility', 'facility', 'Create and modify rooms, bed allocations'),
('visitor:read', 'View Visitor Registry', 'visitor', 'Access visitor records and historical visits'),
('visitor:log', 'Log Visitor Entry', 'visitor', 'Check-in and check-out visitors'),

-- Document Domain
('document:read', 'View Documents', 'document', 'View and download archived resident and legal documents'),
('document:upload', 'Upload Documents', 'document', 'Upload documents to private S3 storage'),
('document:delete', 'Delete Documents', 'document', 'Remove uploaded documents from archive'),

-- Finance Domain (NGO Philanthropy)
('finance:donation:read', 'View Donations', 'finance', 'View incoming donations and donor receipts'),
('finance:donation:create', 'Record Donation', 'finance', 'Record new donation and generate 80G receipt'),
('finance:expense:read', 'View Expenses', 'finance', 'View NGO operating expenses and vouchers'),
('finance:expense:create', 'Record Expense', 'finance', 'Submit operational expense vouchers'),
('finance:report:generate', 'Generate Financial Reports', 'finance', 'Generate annual audit statements and donation registers'),

-- Family Portal Domain
('family:resident:view_own', 'View Assigned Relative', 'family', 'Restricted view of assigned relative vitals and updates')
ON CONFLICT (code) DO NOTHING;
