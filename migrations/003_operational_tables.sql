-- Migration 003: Operational Domain Tables
-- Every operational table strictly contains organization_id for multi-tenant isolation

-- 1. Residents
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    resident_number VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    preferred_name VARCHAR(100),
    date_of_birth DATE,
    age_estimate INTEGER,
    date_of_birth_is_estimated BOOLEAN NOT NULL DEFAULT false,
    gender VARCHAR(20) NOT NULL,
    profile_photo_url TEXT,
    identity_status VARCHAR(50) NOT NULL DEFAULT 'unverified',
    resident_status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'temporary_leave', 'hospitalized', 'discharged', 'reunited', 'deceased'
    admitted_at TIMESTAMPTZ,
    room_number VARCHAR(50),
    bed_code VARCHAR(50),
    primary_diagnosis TEXT,
    emergency_contact JSONB,
    allergies_count INTEGER NOT NULL DEFAULT 0,
    active_medications_count INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_resident_number UNIQUE(organization_id, resident_number)
);

CREATE TRIGGER trg_residents_updated_at
BEFORE UPDATE ON residents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Rescue Cases
CREATE TABLE IF NOT EXISTS rescue_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    case_number VARCHAR(50) NOT NULL,
    person_identifier VARCHAR(255) NOT NULL,
    approximate_age INTEGER,
    gender VARCHAR(20) NOT NULL,
    rescue_location TEXT NOT NULL,
    reporting_source VARCHAR(100),
    reported_by_phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'new', -- 'new', 'under_assessment', 'hospitalized', 'family_tracing', 'temporary_shelter', 'admitted', 'reunited', 'referred'
    urgency_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    assigned_team_leader_id UUID REFERENCES users(id),
    current_health_status TEXT,
    notes TEXT,
    admitted_resident_id UUID REFERENCES residents(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_rescue_case_number UNIQUE(organization_id, case_number)
);

CREATE TRIGGER trg_rescue_cases_updated_at
BEFORE UPDATE ON rescue_cases
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Admissions
CREATE TABLE IF NOT EXISTS admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    admission_number VARCHAR(50) NOT NULL,
    admitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    admission_type VARCHAR(50) NOT NULL DEFAULT 'voluntary',
    admitted_by UUID REFERENCES users(id),
    room_number VARCHAR(50),
    bed_code VARCHAR(50),
    initial_condition_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_admission_number UNIQUE(organization_id, admission_number)
);

-- 4. Medical Records
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES users(id),
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    record_type VARCHAR(50) NOT NULL DEFAULT 'consultation',
    diagnosis TEXT NOT NULL,
    clinical_notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Medical Observations / Vitals
CREATE TABLE IF NOT EXISTS medical_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES users(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    pulse_rate INTEGER,
    blood_glucose NUMERIC(6,2),
    spo2_percentage INTEGER,
    temperature_f NUMERIC(5,2),
    weight_kg NUMERIC(6,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    prescribed_by UUID NOT NULL REFERENCES users(id),
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    route VARCHAR(50) NOT NULL DEFAULT 'oral',
    start_date DATE NOT NULL,
    end_date DATE,
    instructions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Medication Schedules (Administration Logs)
CREATE TABLE IF NOT EXISTS medication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    administered_at TIMESTAMPTZ,
    administered_by UUID REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'administered', 'missed', 'refused'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'present', -- 'present', 'leave', 'hospitalized', 'absent'
    recorded_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_res_attendance_date UNIQUE(organization_id, resident_id, date)
);

-- 9. Rooms & Facilities
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    room_number VARCHAR(50) NOT NULL,
    ward_name VARCHAR(100) NOT NULL,
    gender_designation VARCHAR(20) NOT NULL DEFAULT 'any',
    total_beds INTEGER NOT NULL DEFAULT 1,
    floor_number INTEGER DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_room_number UNIQUE(organization_id, room_number)
);

-- 10. Beds
CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_code VARCHAR(50) NOT NULL,
    current_resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'available', -- 'available', 'occupied', 'maintenance'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_bed_code UNIQUE(organization_id, bed_code)
);

-- 11. Visitors
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    id_proof_number VARCHAR(100),
    relationship VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Visits Log
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checked_out_at TIMESTAMPTZ,
    purpose TEXT,
    logged_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    rescue_case_id UUID REFERENCES rescue_cases(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    s3_key TEXT NOT NULL,
    is_confidential BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. Donations (NGO Philanthropic Funds)
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    donor_name VARCHAR(255) NOT NULL,
    donor_email VARCHAR(255),
    donor_phone VARCHAR(50),
    donor_pan VARCHAR(20),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    receipt_number VARCHAR(50) NOT NULL,
    is_80g_eligible BOOLEAN NOT NULL DEFAULT true,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'upi',
    reference_number VARCHAR(100),
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_receipt_number UNIQUE(organization_id, receipt_number)
);

-- 15. Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    incurred_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_to VARCHAR(255),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. Tasks & Reminders
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    assigned_to UUID REFERENCES users(id),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. Daily Diary / Care Log
CREATE TABLE IF NOT EXISTS daily_diary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift VARCHAR(50) NOT NULL DEFAULT 'morning',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 18. Events & Calendar
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100) NOT NULL DEFAULT 'celebration',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    location VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 19. Tenant Audit Logs
CREATE TABLE IF NOT EXISTS tenant_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and multi-tenant scoping
CREATE INDEX IF NOT EXISTS idx_residents_org ON residents(organization_id);
CREATE INDEX IF NOT EXISTS idx_rescue_org ON rescue_cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_admissions_org ON admissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_med_records_org ON medical_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_med_obs_org ON medical_observations(organization_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_org ON prescriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_med_sched_org ON medication_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_donations_org ON donations(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_org ON tenant_audit_logs(organization_id);
