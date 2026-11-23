# ElderCare OS — Database Schema
## Database Design v1.0

**Status:** Proposed logical schema. Validate against the selected organization model, legal retention requirements and existing infrastructure before production migrations.

## 1. Design assumptions

- PostgreSQL is the system of record.
- UUID primary keys are used for core entities.
- Initial deployment is one NGO with one or more branches; tables are branch-ready.
- `organization_id` scopes organization-owned records. `branch_id` is nullable only for organization-wide records.
- Timestamps are stored in UTC; organization timezone controls display.
- Money uses `NUMERIC(14,2)` plus ISO currency code.
- Sensitive identity and medical data require restricted access and may require field-level encryption or tokenization.
- Uploaded file bytes live in private object storage; PostgreSQL stores metadata and object references.
- Published form versions and finalized financial records are immutable; corrections are recorded as new events/versions.

## 2. Common conventions

Most operational tables should include:
- `id UUID PRIMARY KEY`
- `organization_id UUID NOT NULL`
- `branch_id UUID NULL` where branch-specific
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `created_by UUID NULL REFERENCES users(id)`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_by UUID NULL REFERENCES users(id)`
- `archived_at TIMESTAMPTZ NULL` where archival is appropriate

Do not add these columns blindly to immutable event tables; use the table-specific definitions and audit model.

## 3. Identity and organization

### organizations
- `id UUID PK`
- `name VARCHAR(200) NOT NULL`
- `legal_name VARCHAR(250) NULL`
- `registration_number VARCHAR(120) NULL`
- `email VARCHAR(254) NULL`
- `phone VARCHAR(40) NULL`
- `address JSONB NULL`
- `timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Kolkata'`
- `default_currency CHAR(3) NOT NULL DEFAULT 'INR'`
- `status VARCHAR(20) NOT NULL`
- Common audit columns

### branches
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `name VARCHAR(160) NOT NULL`
- `code VARCHAR(40) NOT NULL`
- `address JSONB NULL`
- `phone VARCHAR(40) NULL`
- `status VARCHAR(20) NOT NULL`
- Unique `(organization_id, code)`

### users
- `id UUID PK`
- `email VARCHAR(254) NULL`
- `phone VARCHAR(40) NULL`
- `display_name VARCHAR(160) NOT NULL`
- `password_hash TEXT NULL` (only if local password auth is selected)
- `auth_provider VARCHAR(40) NOT NULL`
- `provider_subject VARCHAR(200) NULL`
- `status VARCHAR(20) NOT NULL`
- `last_login_at TIMESTAMPTZ NULL`
- Unique provider identity `(auth_provider, provider_subject)` where applicable

### roles
- `id UUID PK`
- `organization_id UUID NULL` (null for platform-level roles)
- `name VARCHAR(80) NOT NULL`
- `description TEXT NULL`
- `is_system BOOLEAN NOT NULL DEFAULT false`

### permissions
- `id UUID PK`
- `code VARCHAR(120) UNIQUE NOT NULL`
- `description TEXT NOT NULL`

### role_permissions
- `role_id UUID FK roles`
- `permission_id UUID FK permissions`
- Composite PK `(role_id, permission_id)`

### user_role_assignments
- `id UUID PK`
- `user_id UUID FK users`
- `role_id UUID FK roles`
- `organization_id UUID FK organizations`
- `branch_id UUID FK branches NULL`
- `granted_by UUID FK users`
- `granted_at TIMESTAMPTZ NOT NULL`
- `revoked_at TIMESTAMPTZ NULL`

### user_sessions
- `id UUID PK`
- `user_id UUID FK users`
- `session_token_hash TEXT NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- `expires_at TIMESTAMPTZ NOT NULL`
- `revoked_at TIMESTAMPTZ NULL`
- `ip_hash TEXT NULL`
- `user_agent_summary TEXT NULL`

## 4. Resident and contact records

### residents
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `resident_number VARCHAR(50) NOT NULL`
- `full_name VARCHAR(200) NULL`
- `preferred_name VARCHAR(120) NULL`
- `date_of_birth DATE NULL`
- `age_estimate SMALLINT NULL`
- `date_of_birth_is_estimated BOOLEAN NOT NULL DEFAULT false`
- `gender VARCHAR(40) NULL`
- `profile_photo_document_id UUID NULL`
- `address JSONB NULL`
- `identity_status VARCHAR(30) NOT NULL DEFAULT 'unknown'`
- `resident_status VARCHAR(30) NOT NULL`
- `admitted_at TIMESTAMPTZ NULL`
- `discharged_at TIMESTAMPTZ NULL`
- `notes TEXT NULL` (avoid storing clinical notes here)
- Common audit columns
- Unique `(organization_id, branch_id, resident_number)`

### resident_contacts
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `name VARCHAR(180) NOT NULL`
- `relationship VARCHAR(80) NULL`
- `phone VARCHAR(40) NULL`
- `email VARCHAR(254) NULL`
- `address JSONB NULL`
- `is_emergency_contact BOOLEAN NOT NULL DEFAULT false`
- `is_primary_contact BOOLEAN NOT NULL DEFAULT false`
- `contact_permission_status VARCHAR(30) NULL`
- Common audit columns

### resident_guardians
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `user_id UUID FK users NULL`
- `contact_id UUID FK resident_contacts NULL`
- `relationship VARCHAR(80) NOT NULL`
- `access_scope JSONB NOT NULL DEFAULT '{}'`
- `verified_at TIMESTAMPTZ NULL`
- `status VARCHAR(20) NOT NULL`

### resident_status_history
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `from_status VARCHAR(30) NULL`
- `to_status VARCHAR(30) NOT NULL`
- `reason TEXT NULL`
- `effective_at TIMESTAMPTZ NOT NULL`
- `recorded_by UUID FK users NOT NULL`

## 5. Rescue and admission

### rescue_cases
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `rescue_number VARCHAR(50) NOT NULL`
- `resident_id UUID FK residents NULL`
- `person_name VARCHAR(200) NULL`
- `approximate_age SMALLINT NULL`
- `gender VARCHAR(40) NULL`
- `rescue_source VARCHAR(80) NOT NULL`
- `reported_by_name VARCHAR(180) NULL`
- `reported_by_phone VARCHAR(40) NULL`
- `rescued_at TIMESTAMPTZ NOT NULL`
- `initial_condition_notes TEXT NULL`
- `immediate_needs TEXT NULL`
- `case_status VARCHAR(40) NOT NULL`
- `closed_at TIMESTAMPTZ NULL`
- Common audit columns
- Unique `(organization_id, branch_id, rescue_number)`

### rescue_locations
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `rescue_case_id UUID FK rescue_cases NOT NULL`
- `latitude NUMERIC(10,7) NULL`
- `longitude NUMERIC(10,7) NULL`
- `accuracy_meters NUMERIC(10,2) NULL`
- `address_text TEXT NULL`
- `capture_source VARCHAR(20) NOT NULL` (`gps`, `manual`, `geocoded`)
- `captured_at TIMESTAMPTZ NULL`
- `captured_by UUID FK users NOT NULL`

### rescue_team_members
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `rescue_case_id UUID FK rescue_cases NOT NULL`
- `user_id UUID FK users NULL`
- `name VARCHAR(180) NOT NULL`
- `role_description VARCHAR(100) NULL`
- `vehicle_details TEXT NULL`

### rescue_follow_ups
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `rescue_case_id UUID FK rescue_cases NOT NULL`
- `follow_up_type VARCHAR(60) NOT NULL`
- `description TEXT NOT NULL`
- `due_at TIMESTAMPTZ NULL`
- `completed_at TIMESTAMPTZ NULL`
- `assigned_to UUID FK users NULL`
- Common audit columns

### family_tracing_attempts
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `rescue_case_id UUID FK rescue_cases NOT NULL`
- `attempted_at TIMESTAMPTZ NOT NULL`
- `method VARCHAR(50) NOT NULL`
- `contact_person TEXT NULL`
- `outcome TEXT NULL`
- `next_follow_up_at TIMESTAMPTZ NULL`
- `recorded_by UUID FK users NOT NULL`

### referrals
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `rescue_case_id UUID FK rescue_cases NULL`
- `resident_id UUID FK residents NULL`
- `destination_name VARCHAR(200) NOT NULL`
- `referral_type VARCHAR(60) NOT NULL`
- `referred_at TIMESTAMPTZ NOT NULL`
- `reason TEXT NULL`
- `outcome TEXT NULL`
- `document_id UUID NULL`

### admissions
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `admission_number VARCHAR(50) NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `rescue_case_id UUID FK rescue_cases NULL`
- `application_source VARCHAR(40) NOT NULL`
- `application_status VARCHAR(30) NOT NULL`
- `applied_at TIMESTAMPTZ NULL`
- `reviewed_at TIMESTAMPTZ NULL`
- `reviewed_by UUID FK users NULL`
- `decision_notes TEXT NULL`
- `admitted_at TIMESTAMPTZ NULL`
- `discharged_at TIMESTAMPTZ NULL`
- `discharge_reason TEXT NULL`
- Common audit columns

### admission_reviews
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `admission_id UUID FK admissions NOT NULL`
- `decision VARCHAR(20) NOT NULL`
- `notes TEXT NULL`
- `reviewed_by UUID FK users NOT NULL`
- `reviewed_at TIMESTAMPTZ NOT NULL`

## 6. Medical and medication records

### medical_records
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `record_type VARCHAR(50) NOT NULL`
- `recorded_at TIMESTAMPTZ NOT NULL`
- `summary TEXT NULL`
- `source_document_id UUID NULL`
- `recorded_by UUID FK users NOT NULL`
- `verified_by UUID FK users NULL`
- `verified_at TIMESTAMPTZ NULL`

### medical_observations
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `observation_type VARCHAR(50) NOT NULL`
- `value_numeric NUMERIC(12,3) NULL`
- `value_text TEXT NULL`
- `unit VARCHAR(30) NULL`
- `observed_at TIMESTAMPTZ NOT NULL`
- `notes TEXT NULL`
- `recorded_by UUID FK users NOT NULL`

### allergies
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `substance VARCHAR(180) NOT NULL`
- `reaction TEXT NULL`
- `severity VARCHAR(30) NULL`
- `verified_by UUID FK users NULL`
- `status VARCHAR(20) NOT NULL`

### appointments
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `provider_name VARCHAR(180) NULL`
- `appointment_type VARCHAR(60) NOT NULL`
- `scheduled_at TIMESTAMPTZ NOT NULL`
- `location TEXT NULL`
- `status VARCHAR(30) NOT NULL`
- `notes TEXT NULL`
- `created_by UUID FK users NOT NULL`

### prescriptions
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `prescriber_name VARCHAR(180) NOT NULL`
- `prescriber_registration_reference VARCHAR(120) NULL`
- `prescribed_at DATE NULL`
- `source_document_id UUID NULL`
- `verified_by UUID FK users NOT NULL`
- `verified_at TIMESTAMPTZ NOT NULL`
- `status VARCHAR(20) NOT NULL`

### medication_schedules
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `prescription_id UUID FK prescriptions NOT NULL`
- `medicine_name VARCHAR(180) NOT NULL`
- `instructions TEXT NOT NULL`
- `dose_text VARCHAR(120) NOT NULL`
- `route VARCHAR(60) NULL`
- `frequency_text VARCHAR(120) NOT NULL`
- `start_date DATE NOT NULL`
- `end_date DATE NULL`
- `status VARCHAR(20) NOT NULL`
- `created_by UUID FK users NOT NULL`

### medication_administrations
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `schedule_id UUID FK medication_schedules NOT NULL`
- `scheduled_at TIMESTAMPTZ NOT NULL`
- `recorded_at TIMESTAMPTZ NOT NULL`
- `status VARCHAR(20) NOT NULL` (administered, missed, refused, withheld)
- `reason TEXT NULL`
- `recorded_by UUID FK users NOT NULL`

### hospital_visits
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `hospital_name VARCHAR(200) NOT NULL`
- `visit_type VARCHAR(50) NOT NULL`
- `arrived_at TIMESTAMPTZ NULL`
- `released_at TIMESTAMPTZ NULL`
- `summary TEXT NULL`
- `discharge_document_id UUID NULL`
- `recorded_by UUID FK users NOT NULL`

## 7. Attendance, movement, visitors and activities

### attendance_entries
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `attendance_date DATE NOT NULL`
- `status VARCHAR(30) NOT NULL`
- `recorded_at TIMESTAMPTZ NOT NULL`
- `notes TEXT NULL`
- `recorded_by UUID FK users NOT NULL`
- Unique `(resident_id, attendance_date)` unless multiple shifts are explicitly required.

### resident_movements
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `movement_type VARCHAR(30) NOT NULL`
- `departed_at TIMESTAMPTZ NULL`
- `returned_at TIMESTAMPTZ NULL`
- `destination TEXT NULL`
- `reason TEXT NULL`
- `accompanied_by TEXT NULL`
- `recorded_by UUID FK users NOT NULL`

### visitors
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `full_name VARCHAR(180) NOT NULL`
- `phone VARCHAR(40) NULL`
- `address JSONB NULL`
- `photo_document_id UUID NULL`
- Common audit columns

### visits
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `visitor_id UUID FK visitors NOT NULL`
- `resident_id UUID FK residents NULL`
- `relationship VARCHAR(80) NULL`
- `purpose TEXT NULL`
- `entry_at TIMESTAMPTZ NOT NULL`
- `exit_at TIMESTAMPTZ NULL`
- `notes TEXT NULL`
- `recorded_by UUID FK users NOT NULL`

### events
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NULL`
- `title VARCHAR(200) NOT NULL`
- `event_type VARCHAR(60) NOT NULL`
- `description TEXT NULL`
- `starts_at TIMESTAMPTZ NOT NULL`
- `ends_at TIMESTAMPTZ NULL`
- `location TEXT NULL`
- `status VARCHAR(20) NOT NULL`
- `budget_amount NUMERIC(14,2) NULL`
- `currency CHAR(3) NULL`
- `created_by UUID FK users NOT NULL`

### event_participants
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `event_id UUID FK events NOT NULL`
- `resident_id UUID FK residents NULL`
- `visitor_name VARCHAR(180) NULL`
- `participation_status VARCHAR(30) NULL`

### daily_activity_entries
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `activity_date DATE NOT NULL`
- `title VARCHAR(200) NOT NULL`
- `description TEXT NOT NULL`
- `completed_work TEXT NULL`
- `pending_work TEXT NULL`
- `participant_count INTEGER NULL`
- `created_by UUID FK users NOT NULL`

## 8. Staff, facilities, food and inventory

### staff_profiles
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `user_id UUID FK users NULL`
- `employee_number VARCHAR(50) NOT NULL`
- `full_name VARCHAR(180) NOT NULL`
- `job_title VARCHAR(100) NOT NULL`
- `phone VARCHAR(40) NULL`
- `joining_date DATE NULL`
- `employment_status VARCHAR(30) NOT NULL`
- Common audit columns

### volunteer_profiles
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `user_id UUID FK users NULL`
- `full_name VARCHAR(180) NOT NULL`
- `phone VARCHAR(40) NULL`
- `start_date DATE NULL`
- `status VARCHAR(20) NOT NULL`

### staff_attendance
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `staff_id UUID FK staff_profiles NOT NULL`
- `work_date DATE NOT NULL`
- `status VARCHAR(20) NOT NULL`
- `check_in_at TIMESTAMPTZ NULL`
- `check_out_at TIMESTAMPTZ NULL`
- `recorded_by UUID FK users NOT NULL`

### buildings
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `name VARCHAR(120) NOT NULL`

### rooms
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `building_id UUID FK buildings NULL`
- `room_number VARCHAR(40) NOT NULL`
- `floor_label VARCHAR(40) NULL`
- `capacity SMALLINT NOT NULL`
- `status VARCHAR(20) NOT NULL`

### beds
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `room_id UUID FK rooms NOT NULL`
- `bed_code VARCHAR(40) NOT NULL`
- `status VARCHAR(20) NOT NULL`

### bed_allocations
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `bed_id UUID FK beds NOT NULL`
- `starts_at TIMESTAMPTZ NOT NULL`
- `ends_at TIMESTAMPTZ NULL`
- `allocated_by UUID FK users NOT NULL`

Use a PostgreSQL exclusion constraint or transactional locking strategy to prevent overlapping allocations for the same bed.

### meal_menus
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `menu_date DATE NOT NULL`
- `meal_type VARCHAR(30) NOT NULL`
- `menu_description TEXT NOT NULL`
- `created_by UUID FK users NOT NULL`

### dietary_requirements
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `resident_id UUID FK residents NOT NULL`
- `requirement TEXT NOT NULL`
- `source TEXT NULL`
- `effective_from DATE NULL`
- `effective_to DATE NULL`
- `verified_by UUID FK users NULL`

### inventory_items
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `item_code VARCHAR(60) NOT NULL`
- `name VARCHAR(180) NOT NULL`
- `category VARCHAR(60) NOT NULL`
- `unit VARCHAR(30) NOT NULL`
- `reorder_level NUMERIC(14,3) NULL`
- `status VARCHAR(20) NOT NULL`

### stock_movements
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `item_id UUID FK inventory_items NOT NULL`
- `movement_type VARCHAR(20) NOT NULL`
- `quantity NUMERIC(14,3) NOT NULL`
- `occurred_at TIMESTAMPTZ NOT NULL`
- `reference TEXT NULL`
- `recorded_by UUID FK users NOT NULL`

### maintenance_requests
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NOT NULL`
- `room_id UUID FK rooms NULL`
- `title VARCHAR(180) NOT NULL`
- `description TEXT NULL`
- `priority VARCHAR(20) NOT NULL`
- `status VARCHAR(20) NOT NULL`
- `assigned_to UUID FK users NULL`
- `completed_at TIMESTAMPTZ NULL`

## 9. Finance

### donors
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `name VARCHAR(180) NOT NULL`
- `phone VARCHAR(40) NULL`
- `email VARCHAR(254) NULL`
- `address JSONB NULL`
- `created_at TIMESTAMPTZ NOT NULL`

### donations
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NULL`
- `donor_id UUID FK donors NULL`
- `amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0)`
- `currency CHAR(3) NOT NULL`
- `donated_at TIMESTAMPTZ NOT NULL`
- `payment_method VARCHAR(40) NOT NULL`
- `purpose TEXT NULL`
- `transaction_reference VARCHAR(160) NULL`
- `status VARCHAR(20) NOT NULL`
- `recorded_by UUID FK users NOT NULL`

### donation_receipts
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `donation_id UUID FK donations NOT NULL`
- `receipt_number VARCHAR(60) NOT NULL`
- `issued_at TIMESTAMPTZ NOT NULL`
- `generated_document_id UUID NULL`
- `issued_by UUID FK users NOT NULL`
- Unique `(organization_id, receipt_number)`

### expenses
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NULL`
- `category_id UUID NULL`
- `amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0)`
- `currency CHAR(3) NOT NULL`
- `spent_at DATE NOT NULL`
- `payee VARCHAR(180) NULL`
- `description TEXT NOT NULL`
- `status VARCHAR(20) NOT NULL`
- `recorded_by UUID FK users NOT NULL`

## 10. Documents, OCR and dynamic forms

### documents
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NULL`
- `document_number VARCHAR(80) NULL`
- `title VARCHAR(240) NOT NULL`
- `category VARCHAR(80) NOT NULL`
- `mime_type VARCHAR(120) NOT NULL`
- `file_size_bytes BIGINT NOT NULL`
- `storage_object_key TEXT NOT NULL`
- `checksum_sha256 CHAR(64) NOT NULL`
- `issued_by TEXT NULL`
- `issued_at DATE NULL`
- `expires_at DATE NULL`
- `source_type VARCHAR(40) NOT NULL`
- `classification_status VARCHAR(20) NOT NULL`
- `uploaded_by UUID FK users NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL`

### document_versions
- `id UUID PK`
- `document_id UUID FK documents NOT NULL`
- `version_number INTEGER NOT NULL`
- `storage_object_key TEXT NOT NULL`
- `checksum_sha256 CHAR(64) NOT NULL`
- `uploaded_at TIMESTAMPTZ NOT NULL`
- `uploaded_by UUID FK users NOT NULL`
- Unique `(document_id, version_number)`

### document_links
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `document_id UUID FK documents NOT NULL`
- `entity_type VARCHAR(60) NOT NULL`
- `entity_id UUID NOT NULL`
- `relationship_label VARCHAR(80) NULL`
- `created_at TIMESTAMPTZ NOT NULL`

Because polymorphic links cannot use a conventional FK to every domain table, validate the entity type and target in the application service and audit link changes.

### document_extraction_jobs
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `document_id UUID FK documents NOT NULL`
- `document_version_id UUID FK document_versions NULL`
- `status VARCHAR(30) NOT NULL`
- `provider VARCHAR(80) NULL`
- `model_version VARCHAR(120) NULL`
- `language_detected VARCHAR(40) NULL`
- `started_at TIMESTAMPTZ NULL`
- `completed_at TIMESTAMPTZ NULL`
- `failure_code VARCHAR(80) NULL`
- `failure_message_safe TEXT NULL`
- `created_by UUID FK users NOT NULL`

### extracted_fields
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `job_id UUID FK document_extraction_jobs NOT NULL`
- `field_key VARCHAR(120) NOT NULL`
- `candidate_value JSONB NOT NULL`
- `confidence NUMERIC(5,4) NULL`
- `page_number INTEGER NULL`
- `source_evidence JSONB NULL`
- `review_status VARCHAR(20) NOT NULL`
- `reviewed_value JSONB NULL`
- `reviewed_by UUID FK users NULL`
- `reviewed_at TIMESTAMPTZ NULL`

### form_definitions
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `name VARCHAR(200) NOT NULL`
- `description TEXT NULL`
- `form_category VARCHAR(80) NOT NULL`
- `status VARCHAR(20) NOT NULL`
- `created_by UUID FK users NOT NULL`

### form_versions
- `id UUID PK`
- `form_definition_id UUID FK form_definitions NOT NULL`
- `version_number INTEGER NOT NULL`
- `schema_json JSONB NOT NULL`
- `layout_json JSONB NULL`
- `source_document_id UUID FK documents NULL`
- `status VARCHAR(20) NOT NULL`
- `approved_by UUID FK users NULL`
- `approved_at TIMESTAMPTZ NULL`
- `published_at TIMESTAMPTZ NULL`
- Unique `(form_definition_id, version_number)`

### form_submissions
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `form_version_id UUID FK form_versions NOT NULL`
- `resident_id UUID FK residents NULL`
- `submission_number VARCHAR(60) NOT NULL`
- `answers_json JSONB NOT NULL`
- `status VARCHAR(20) NOT NULL`
- `submitted_at TIMESTAMPTZ NULL`
- `reviewed_by UUID FK users NULL`
- `reviewed_at TIMESTAMPTZ NULL`
- `generated_document_id UUID NULL`

## 11. Tasks, notifications, reports and audit

### tasks
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `branch_id UUID FK branches NULL`
- `title VARCHAR(200) NOT NULL`
- `description TEXT NULL`
- `priority VARCHAR(20) NOT NULL`
- `status VARCHAR(20) NOT NULL`
- `assigned_to UUID FK users NULL`
- `due_at TIMESTAMPTZ NULL`
- `recurrence_rule TEXT NULL`
- `related_entity_type VARCHAR(60) NULL`
- `related_entity_id UUID NULL`
- Common audit columns

### notifications
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `user_id UUID FK users NOT NULL`
- `channel VARCHAR(20) NOT NULL`
- `title VARCHAR(180) NOT NULL`
- `body TEXT NOT NULL`
- `status VARCHAR(20) NOT NULL`
- `read_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL`

### notification_deliveries
- `id UUID PK`
- `notification_id UUID FK notifications NOT NULL`
- `provider VARCHAR(80) NOT NULL`
- `provider_reference VARCHAR(180) NULL`
- `status VARCHAR(20) NOT NULL`
- `attempt_count SMALLINT NOT NULL DEFAULT 0`
- `last_attempt_at TIMESTAMPTZ NULL`

### report_jobs
- `id UUID PK`
- `organization_id UUID FK organizations NOT NULL`
- `report_type VARCHAR(80) NOT NULL`
- `filters_json JSONB NOT NULL`
- `format VARCHAR(10) NOT NULL`
- `status VARCHAR(20) NOT NULL`
- `generated_document_id UUID NULL`
- `requested_by UUID FK users NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- `completed_at TIMESTAMPTZ NULL`

### audit_events
- `id UUID PK`
- `organization_id UUID NULL`
- `branch_id UUID NULL`
- `actor_user_id UUID FK users NULL`
- `action VARCHAR(100) NOT NULL`
- `entity_type VARCHAR(80) NOT NULL`
- `entity_id UUID NULL`
- `occurred_at TIMESTAMPTZ NOT NULL`
- `request_id VARCHAR(100) NULL`
- `ip_hash TEXT NULL`
- `metadata_safe JSONB NOT NULL DEFAULT '{}'`

Audit records must not contain passwords, tokens, full identity numbers, medical note contents or document contents.

## 12. Indexes and constraints

At minimum:
- Index all foreign keys used for joins.
- Composite indexes for `(organization_id, branch_id, status)` on major list screens.
- Index residents by normalized/searchable name and resident number.
- Index rescue cases by status and rescued timestamp.
- Index admissions by status and applied/admitted timestamps.
- Index visits by entry timestamp and resident.
- Index tasks by assigned user, status and due date.
- Index documents by category, expiry date and upload date.
- Index notifications by user and unread status.
- Index audit events by entity and timestamp.
- Unique resident/admission/rescue/receipt numbers within organization/branch scope.
- Check positive/valid money and quantity values.
- Enforce valid status transitions in domain services.
- Enforce no overlapping active bed allocations transactionally or with an exclusion constraint.
- Add tenant/branch scope to every query and test cross-organization isolation.

## 13. Data lifecycle and deletion

- Prefer archive/status changes over hard deletion for resident, rescue, medical, finance and admission records.
- Define retention schedules with qualified legal review.
- Support correction records and document version history.
- Implement an approved process for access, export, correction and deletion requests.
- Ensure backups and replicas follow the same protection and retention requirements.
- A hard delete must be exceptional, authorized, audited and consistent with legal obligations.

## 14. Migration order

1. Organizations and branches.
2. Users, roles, permissions and assignments.
3. Residents and contacts.
4. Rescue cases and locations.
5. Admissions and reviews.
6. Documents and links.
7. Rooms, beds and allocations.
8. Medical and medication tables.
9. Attendance, movement, visitors and visits.
10. Events, activities and tasks.
11. Staff, volunteers and facilities.
12. Finance and inventory.
13. OCR, forms and submissions.
14. Notifications, reports and audit.

## 15. Schema review checklist

- Confirm one-home vs branch vs SaaS tenant model.
- Confirm unknown identity and duplicate resident handling.
- Confirm whether one resident can have multiple admissions.
- Confirm attendance granularity (once daily or multiple shifts).
- Confirm visitor privacy and retention.
- Confirm medical record access roles.
- Confirm required compliance fields and retention.
- Confirm storage provider and encryption approach.
- Review indexes using expected record volume.
- Generate Prisma schema and migrations only after review.
