# ElderCare OS --- System Architecture

## Architecture Document v1.0

  -----------------------------------------------------------------------
  Field                               Value
  ----------------------------------- -----------------------------------
  Product                             ElderCare OS

  Document                            System Architecture

  Version                             1.0

  Status                              Proposed architecture --- validate
                                      during repository and environment
                                      discovery

  Related document                    `PRD.md`

  Date                                14 November 2026
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 1. Purpose

This document translates the ElderCare OS PRD into a technical
architecture. It defines the major application layers, module
boundaries, data ownership, security model, integrations, background
processing, deployment considerations and implementation sequence.

This is a proposed greenfield architecture. Before creating or replacing
code, inspect the existing repository, database, authentication
provider, deployment configuration and available infrastructure.
Preserve working components unless a deliberate migration is approved.

## 2. Architecture Principles

1.  **Backend-first, vertical-slice delivery:** implement and test
    complete workflows rather than building disconnected screens.
2.  **Modular monolith initially:** use one deployable backend with
    clear domain modules. Avoid premature microservices.
3.  **PostgreSQL as the source of truth:** structured records and
    relationships live in the relational database.
4.  **Private file storage:** original documents and images are stored
    outside the relational database, with metadata and access policy in
    PostgreSQL.
5.  **Human approval for sensitive automation:** OCR/AI creates
    suggestions and drafts; authorized users approve changes.
6.  **Least privilege:** enforce access on the server for every record
    and action.
7.  **Auditability:** sensitive reads, writes, approvals, exports and
    administrative actions are traceable.
8.  **Provider independence:** OCR, AI, maps, email and messaging
    providers are accessed through adapters.
9.  **Data minimization:** collect only information needed for care,
    administration or legal obligations.
10. **Extensibility:** support branch-aware data ownership even if the
    first deployment has one home.
11. **Recoverability:** database and document backups must be
    coordinated and restoration-tested.
12. **No false automation:** GPS, identity extraction, government form
    generation and clinical information must show provenance and require
    appropriate verification.

------------------------------------------------------------------------

## 3. System Context

### 3.1 Primary actors

-   NGO administrator
-   Super administrator / system owner
-   Doctor or medical officer
-   Nurse or caretaker
-   Accountant
-   Staff member
-   Volunteer
-   Authorized family member or guardian
-   Public user submitting a rescue or admission request (if enabled)

### 3.2 External systems

-   Email/SMS/WhatsApp provider (optional, later phase)
-   OCR/document intelligence provider
-   AI model provider
-   Map/geocoding provider
-   Object storage provider
-   PDF generation library/service
-   Backup destination
-   Optional payment provider, if online donations are later approved

### 3.3 Context diagram (logical)

``` text
[Staff / Admin / Doctor / Accountant / Guardian]
                       |
                 Web Application
                       |
                 Backend API
                       |
       +---------------+----------------+
       |               |                |
   PostgreSQL     Private File      Background
   Database       Storage          Job Workers
       |               |                |
       +---------------+----------------+
                       |
              Integration Adapters
       +---------------+----------------------+
       |               |           |          |
      OCR/AI          Maps      Messaging   Backup
```

The browser must never connect directly to the database or private
object storage using permanent credentials. All access is mediated by
authenticated backend services and short-lived, scoped upload/download
permissions where appropriate.

------------------------------------------------------------------------

## 4. Recommended Technology Direction

The stack below is a proposal, not an instruction to replace existing
infrastructure.

  -----------------------------------------------------------------------
  Layer                   Preferred option        Notes
  ----------------------- ----------------------- -----------------------
  Web frontend            Next.js + TypeScript    Responsive
                                                  desktop/tablet/mobile
                                                  interface

  UI                      React component         Shared forms, tables,
                          system + accessible     dialogs and status
                          design primitives       patterns

  Backend                 NestJS + TypeScript     Modular monolith with
                                                  domain modules

  API style               REST, versioned under   OpenAPI/Swagger
                          `/api/v1`               contract

  Database                PostgreSQL              Relational source of
                                                  truth

  ORM/migrations          Prisma                  Schema migrations under
                                                  source control

  Authentication          Secure server-side      Decide after
                          session or vetted       infrastructure
                          identity provider       discovery

  Authorization           Backend RBAC +          Deny by default
                          record-level policies   

  File storage            Private S3-compatible   Provider adapter
                          object storage          

  Background jobs         Redis-backed queue      OCR, reminders,
                          (e.g. BullMQ) or        exports, notifications
                          managed queue           

  OCR                     Provider adapter;       English/Hindi support
                          evaluate cloud and      and privacy review
                          self-hosted options     

  AI                      Provider adapter with   No direct writes to
                          structured output       verified records
                          validation              

  Maps                    Map/geocoding adapter   Provider selected after
                                                  cost/privacy review

  PDF                     Server-side PDF         Templates and
                          generation              source-version tracking

  Spreadsheet             XLSX generation         Exports must respect
                                                  permissions

  Testing                 Jest/Vitest, Supertest, Unit, integration and
                          Playwright (or existing E2E
                          equivalents)            

  Observability           Structured logs,        Never log sensitive
                          metrics and error       document contents
                          monitoring              

  Deployment              To be selected          Local development
                                                  first; production after
                                                  readiness review
  -----------------------------------------------------------------------

### 4.1 Stack decision gate

Before implementation, inspect: - Existing repository and package
manager. - Existing frontend/backend frameworks. - Existing database and
migration state. - Existing authentication. - Existing hosting and
object storage. - Existing CI and test commands. - Whether the product
is single-organization or multi-tenant.

Do not introduce duplicate infrastructure if a suitable component
already exists.

------------------------------------------------------------------------

## 5. High-Level Application Architecture

Use a modular monolith. Each module owns its business rules and exposes
services through defined interfaces. Modules may share a PostgreSQL
database but must not bypass domain service boundaries with arbitrary
cross-module writes.

``` text
Web Client
   |
   v
API / Authentication / Request Validation
   |
   +-- Identity & Access Module
   +-- Organization & Branch Module
   +-- Resident Module
   +-- Rescue Module
   +-- Admission Module
   +-- Care & Medical Module
   +-- Medication Module
   +-- Attendance & Movement Module
   +-- Visitor Module
   +-- Events & Activities Module
   +-- Staff & Volunteer Module
   +-- Rooms & Facilities Module
   +-- Food & Nutrition Module
   +-- Inventory & Maintenance Module
   +-- Finance & Donations Module
   +-- Document Vault Module
   +-- Document Intelligence Module
   +-- Dynamic Forms Module
   +-- Tasks & Notifications Module
   +-- Reports Module
   +-- Audit Module
   |
   +-- PostgreSQL
   +-- Private Object Storage
   +-- Background Job Queue
```

------------------------------------------------------------------------

## 6. Backend Module Boundaries

### 6.1 Identity and Access

Owns: - Users - Credentials/session references - Roles - Permissions -
Role assignments - Account status - Session revocation - Authentication
events

Must expose authorization checks to every protected module.

### 6.2 Organization and Branch

Owns: - Organization profile - Branch/home records - Organization
settings - Timezone and locale - Numbering sequences - Configurable
categories

All operational records should be scoped to an organization and, where
relevant, a branch.

### 6.3 Resident

Owns: - Resident master profile - Emergency contacts - Guardian
relationships - Resident status - Resident profile history

Resident profile data should not duplicate entire medical, admission or
attendance records. Those modules own their respective histories and
link to the resident.

### 6.4 Rescue

Owns: - Rescue case - Rescue source - Rescue location capture - Rescue
team participation - Initial observations - Family tracing attempts -
Hospital/referral records - Rescue case status and timeline

A rescue case may be linked to a resident after identity matching and
approval. Unknown identity must be supported.

### 6.5 Admission

Owns: - Admission applications - Admission review - Required document
checklist - Approval/rejection decision - Admission agreement snapshot -
Admission and discharge events

Admission may originate from a rescue case or a direct application.

### 6.6 Care and Medical

Owns: - Medical history - Conditions and allergies - Health
observations - Doctor appointments - Clinical notes - Hospital visits
and transfers - Prescriptions as entered/verified by authorized
personnel

Medical data has stricter permissions than general resident data.

### 6.7 Medication

Owns: - Medication catalogue (if needed) - Prescribed medication
instructions - Schedules - Administration events -
Missed/refused/withheld events - Stock/expiry links where inventory is
enabled

The module must not infer or modify clinical dosage instructions.

### 6.8 Attendance and Movement

Owns: - Attendance entries - Leave records - Outside-premises movement -
Departure and return events

A movement record is not continuous location tracking.

### 6.9 Visitor

Owns: - Visitor records - Visit records - Entry and exit timestamps -
Resident visit relationships - Visit purpose and notes

Visitor data collection must be proportionate and configurable.

### 6.10 Events and Activities

Owns: - Events - Participants - Event assignments - Event expenses
(linked to finance) - Event attendance - Daily activity entries - Daily
diary

### 6.11 People

Owns: - Staff profiles - Volunteer profiles - Doctor directory
references - Staff attendance - Duty schedules - Assignments and leave
records

Authentication accounts are linked but remain owned by Identity and
Access.

### 6.12 Facilities

Owns: - Buildings/floors/rooms/beds - Bed allocation history - Capacity
and occupancy state - Assets and maintenance requests

Bed allocation must enforce no overlapping active allocations for the
same bed.

### 6.13 Food and Nutrition

Owns: - Meal menus - Dietary requirements - Food allergies (with
appropriate medical linkage) - Meal distribution records - Nutrition
recommendations and source

### 6.14 Inventory and Maintenance

Owns: - Inventory items - Suppliers - Stock movements -
Purchase/issue/adjustment records - Maintenance requests and work
history

Medicine stock may be linked to Medication but must retain appropriate
controls.

### 6.15 Finance and Donations

Owns: - Donors - Donations - Receipts - Expense records - Expense
categories - Budgets (later phase) - Financial report source data

Financial records must be immutable or correction-based after
finalization, with audit history.

### 6.16 Document Vault

Owns: - Document metadata - Storage object references - Document
categories - Document links to domain records - Document versions -
Expiry and renewal metadata - Access and download events

Original file bytes live in private object storage, not in PostgreSQL.

### 6.17 Document Intelligence

Owns: - Extraction jobs - OCR results - AI classification results -
Candidate extracted fields - Confidence/provenance metadata - Review and
approval outcomes

It must not write directly into verified resident or medical records. It
submits approved changes through the owning module's service.

### 6.18 Dynamic Forms

Owns: - Form definitions - Form versions - Fields and validation rules -
Source document references - Approval/publishing history - Form
submissions - Submission snapshots - Generated PDF references

Published form versions are immutable. Changes create a new version.

### 6.19 Tasks and Notifications

Owns: - Tasks - Recurrence rules - Reminders - Notification
preferences - Delivery attempts - In-app notifications

External messages should be queued and retried safely.

### 6.20 Reports

Owns: - Report definitions - Export jobs - Generated file references -
Report execution metadata

Reports query authorized source modules and must not bypass access
policies.

### 6.21 Audit

Owns: - Audit events - Sensitive record access events - Approval
events - Export events - Administrative security events

Audit records should be append-only for normal application users.

------------------------------------------------------------------------

## 7. Data Architecture

### 7.1 Database conventions

-   Use UUID primary keys for core entities.
-   Use explicit foreign keys and indexes.
-   Use `created_at`, `updated_at`, and actor fields where appropriate.
-   Store timestamps in UTC; display in configured organization
    timezone.
-   Use `date` for date-only values.
-   Use numeric/decimal types for money, never floating point.
-   Store currency code with monetary values.
-   Use controlled enums or reference tables for statuses and
    categories.
-   Add `organization_id` and, where appropriate, `branch_id` to
    tenant/branch-owned records.
-   Use database constraints for critical invariants.
-   Use migrations; never edit production schema manually.
-   Avoid storing unnecessary identity numbers in plain text.
-   Keep original uploaded files separate from extracted structured
    data.

### 7.2 Core entity groups

**Identity and organization** - organizations - branches - users -
roles - permissions - user_role_assignments - role_permissions -
user_sessions

**Resident and rescue** - residents - resident_contacts -
resident_guardians - rescue_cases - rescue_locations -
rescue_team_members - rescue_follow_ups - family_tracing_attempts -
referrals - admissions - admission_reviews - resident_status_history

**Care** - medical_records - medical_observations - allergies -
appointments - prescriptions - medication_schedules -
medication_administrations - hospital_visits - care_notes

**Operations** - attendance_entries - resident_movements - visitors -
visits - events - event_participants - daily_activity_entries - tasks -
task_comments - notifications

**People and facilities** - staff_profiles - volunteer_profiles -
staff_attendance - duty_assignments - buildings - floors - rooms -
beds - bed_allocations - maintenance_requests

**Documents and forms** - documents - document_versions -
document_links - document_extraction_jobs - extracted_fields -
extraction_reviews - form_definitions - form_versions - form_fields -
form_submissions - generated_files

**Finance and inventory** - donors - donations - donation_receipts -
expense_categories - expenses - inventory_items - stock_movements -
suppliers

**Platform** - audit_events - report_jobs - integration_settings -
numbering_sequences

This is an entity inventory, not the final database schema. Exact
columns, cardinalities, indexes, constraints and deletion policies
belong in `database-schema.md`.

### 7.3 Relationship rules

-   One resident can have multiple admissions over time, subject to
    policy.
-   One rescue case may be linked to zero or one resulting resident
    initially; a reviewed merge workflow handles identity matching.
-   A resident can have many medical records, observations,
    appointments, visits, attendance entries and linked documents.
-   A bed can have many historical allocations but only one overlapping
    active allocation.
-   A document can be linked to multiple records only where explicitly
    allowed and authorized.
-   A form submission must reference the exact immutable form version
    used.
-   An extraction job must reference its source document version.
-   A generated report must record its filters, creator, creation time
    and source scope.

------------------------------------------------------------------------

## 8. API Architecture

### 8.1 API conventions

-   Base path: `/api/v1`
-   JSON request/response by default.
-   OpenAPI documentation.
-   Consistent validation and error envelope.
-   Pagination for list endpoints.
-   Filtering and sorting allowlists.
-   Idempotency keys for retryable create operations where needed.
-   Request correlation ID for tracing.
-   Backend authorization on every route and referenced object.
-   Avoid exposing internal storage paths or provider credentials.

Example endpoint groups:

``` text
/api/v1/auth/*
/api/v1/organizations/*
/api/v1/branches/*
/api/v1/users/*
/api/v1/roles/*
/api/v1/residents/*
/api/v1/rescue-cases/*
/api/v1/admissions/*
/api/v1/medical/*
/api/v1/medications/*
/api/v1/attendance/*
/api/v1/visitors/*
/api/v1/events/*
/api/v1/activities/*
/api/v1/staff/*
/api/v1/rooms/*
/api/v1/documents/*
/api/v1/document-intelligence/*
/api/v1/forms/*
/api/v1/finance/*
/api/v1/tasks/*
/api/v1/reports/*
/api/v1/audit/*
```

### 8.2 Error response shape

Use a consistent response such as:

``` json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Please review the highlighted fields.",
  "details": [],
  "requestId": "correlation-id"
}
```

Do not return stack traces, SQL details, secrets or sensitive data to
clients.

### 8.3 API security

-   Validate ownership and organization scope for every object ID.
-   Prevent insecure direct object reference (IDOR).
-   Use rate limits on login, public forms and uploads.
-   Validate uploaded content independently of filename and MIME header.
-   Use short-lived upload/download authorization.
-   Apply export permissions separately from view permissions.

------------------------------------------------------------------------

## 9. Document and AI Processing Architecture

### 9.1 Upload pipeline

``` text
User selects file
      |
Backend validates authorization and metadata
      |
File safety checks (size/type/content; malware scan where available)
      |
Private object storage
      |
Document metadata saved in PostgreSQL
      |
Background extraction job queued
      |
PDF text extraction or OCR
      |
AI classification and candidate field extraction
      |
Structured output validation
      |
Human review screen with source evidence
      |
Approved values sent to owning domain service
      |
Audit event recorded
```

### 9.2 Required provenance

For each extracted field, store where available: - Source document ID
and version. - Page number. - Extracted text snippet or bounding region
reference. - Extraction provider/model and version. - Confidence
indicator (not treated as truth). - Extraction timestamp. - Reviewer and
review timestamp. - Final accepted value and correction history.

### 9.3 Safety controls

-   Never overwrite verified data silently.
-   Never treat OCR output as verified identity.
-   Mask identity numbers in review screens unless full display is
    required.
-   Require authorized review for medical data.
-   Do not infer medicine dosage.
-   Do not use uploaded documents to train external models unless
    explicitly authorized and contractually appropriate.
-   Review provider data retention, region and processing terms.
-   Do not send full documents to an AI provider if local extraction or
    selective redaction is sufficient.

### 9.4 Dynamic form generation pipeline

``` text
Administrator uploads blank source form
      |
Store original and source metadata
      |
Extract text and analyze layout
      |
Generate draft field schema
      |
Administrator edits and compares with source
      |
Validate field rules and output layout
      |
Authorized approval
      |
Publish immutable form version
      |
User submits digital form
      |
Generate completed PDF
      |
Store submission snapshot and generated file
```

The system must distinguish: - Original source document. - Draft
generated form. - Approved published form version. - User submission. -
Completed generated PDF.

These are separate records and must not overwrite one another.

------------------------------------------------------------------------

## 10. Location and Time Capture

### 10.1 Location

-   Location capture is user-initiated.
-   Browser/device permission is required.
-   Save latitude, longitude, capture time and accuracy when provided.
-   Save the source as GPS, manual entry or geocoded address.
-   Reverse geocoded address is a suggestion and must be editable.
-   If permission is denied or GPS fails, allow manual address entry.
-   Do not continuously track residents, visitors or staff.
-   Do not expose exact rescue coordinates in public pages or ordinary
    reports.

### 10.2 Time

-   Store event timestamps in UTC.
-   Display in the organization's configured timezone.
-   Record server timestamp and, if relevant, user-entered event time
    separately.
-   Manual corrections to entry/exit or attendance times require
    permission and audit history.

------------------------------------------------------------------------

## 11. Background Jobs and Event Processing

Use a queue for work that should not block a user's request.

Initial job types: - OCR/document extraction. - AI classification and
field extraction. - PDF generation. - Excel export. - Scheduled
reminders. - Recurring task creation. - Notification delivery. - Backup
verification. - Document expiry checks.

Requirements: - Retry transient failures with bounded backoff. - Make
jobs idempotent. - Store job status and failure reason without sensitive
payloads. - Support dead-letter/failure review. - Prevent duplicate
reminders and duplicate generated receipts. - Provide an admin-visible
processing status.

------------------------------------------------------------------------

## 12. Security Architecture

### 12.1 Authentication

-   Use a vetted authentication mechanism.
-   Secure password hashing if passwords are locally managed.
-   Secure cookies for browser sessions where applicable.
-   Session expiration and revocation.
-   Optional MFA for privileged accounts.
-   Account recovery with verified channels.

### 12.2 Authorization

-   Deny by default.
-   RBAC plus record-level checks.
-   Organization and branch isolation.
-   Separate access to general profile, medical, identity, finance and
    personnel information.
-   Enforce in backend services and queries, not only in UI.

### 12.3 Files

-   Private buckets/containers.
-   Short-lived signed URLs.
-   Encryption in transit and at rest.
-   Malware scanning where available.
-   Content type and size validation.
-   No executable file previews.
-   Access logging.
-   Retention and deletion controls.

### 12.4 Audit

Log: - Authentication and failed authentication events. - Sensitive
resident/medical record views. - Create/update/archive operations. -
Approval and rejection decisions. - Document upload/download. -
Exports. - Permission and configuration changes. - AI extraction
approval and correction.

Do not put full medical notes, identity numbers, passwords, tokens or
document contents into audit messages.

### 12.5 Compliance

Before production, obtain appropriate review of applicable Indian data
protection, health information, identity document, child/elder
protection (where applicable), financial, NGO and government reporting
obligations. Product controls should be configurable to the
organization's actual legal obligations.

------------------------------------------------------------------------

## 13. Deployment and Environments

Proposed environments: - Local development - Automated test/CI -
Staging - Production

Each environment must have separate credentials, storage and databases.

Production requirements: - TLS. - Secret manager or protected
environment configuration. - Database network restrictions. - Private
object storage. - Scheduled backups. - Monitoring and alerting. -
Deployment rollback procedure. - Database migration review. - Restore
testing. - No production data in development/test environments unless
appropriately anonymized and authorized.

The exact hosting provider and infrastructure size remain open until
expected users, file volume, availability needs and budget are
confirmed.

------------------------------------------------------------------------

## 14. Observability and Operations

Track: - API latency and error rate. - Database health and slow
queries. - Queue depth and job failure rate. - OCR processing time and
failure rate. - Storage usage and upload failures. - Notification
delivery status. - Backup completion and restore-test results. -
Authentication failures and suspicious access patterns.

Logs must be structured and privacy-safe. Operational dashboards should
use aggregate information and avoid unnecessary personal details.

------------------------------------------------------------------------

## 15. Testing Strategy

### Unit tests

-   Domain rules and status transitions.
-   Validation.
-   Permission policies.
-   Calculations and report filters.

### Integration tests

-   Database constraints and migrations.
-   Storage upload/download authorization.
-   Queue processing.
-   OCR provider adapters.
-   PDF generation.
-   Audit event creation.

### End-to-end tests

-   Rescue-to-admission.
-   Admission and bed allocation.
-   Resident attendance and visitor record.
-   Medical record permission boundaries.
-   Document extraction and review.
-   Dynamic form creation, publication and submission.
-   Reports and exports.
-   Backup restoration.

### Security tests

-   IDOR and cross-organization access.
-   Role escalation.
-   Upload abuse.
-   Session revocation.
-   Sensitive export access.
-   Rate limiting.
-   Audit tampering resistance.

------------------------------------------------------------------------

## 16. Repository Structure Proposal

Adapt this to the existing repository rather than forcing a rewrite.

``` text
eldercare-os/
  apps/
    web/                         # Next.js application
    api/                         # NestJS application
    worker/                      # Background job worker (if separate process)
  packages/
    contracts/                   # Shared API schemas/types
    config/                      # Shared lint/tsconfig
    ui/                          # Shared UI components (if monorepo)
  docs/
    PRD.md
    architecture.md
    database-schema.md
    api-specification.md
    security.md
    runbook.md
  infrastructure/
    local/
    deployment/
  scripts/
  tests/
    e2e/
  .env.example
  README.md
```

If the repository is not a monorepo or already has a clear structure,
preserve its established conventions.

------------------------------------------------------------------------

## 17. Implementation Sequence

### Step 1 --- Discovery

-   Inspect repository, package manager and current scripts.
-   Inspect current database and auth provider.
-   Identify reusable components and existing constraints.
-   Confirm organization scope, branch needs, user count and hosting.

### Step 2 --- Architecture and schema approval

-   Review this document.
-   Create detailed `database-schema.md`.
-   Define data classification and permission matrix.
-   Define API contracts.

### Step 3 --- Foundation

-   Environment configuration.
-   Database migrations.
-   Authentication and RBAC.
-   Organization/branch scope.
-   Audit framework.
-   Private document storage.
-   Backup/restore.

### Step 4 --- First vertical slice

Implement: 1. Create resident. 2. Create rescue case. 3. Attach a
document. 4. Review and approve extracted fields (initially OCR provider
can be stubbed behind an interface). 5. Convert rescue case into
admission. 6. Allocate room/bed. 7. Verify audit and permissions.

### Step 5 --- Daily operations

Attendance, visitors, diary, events, tasks and reminders.

### Step 6 --- Care modules

Medical records, appointments, medicine schedules and administration.

### Step 7 --- Documents and dynamic forms

OCR, AI extraction, form builder, versioning and PDF output.

### Step 8 --- Finance, inventory and reports

Donations, expenses, stock, maintenance and exports.

### Step 9 --- UX completion and release readiness

Responsive UI, accessibility, performance, security tests, backup drills
and user acceptance.

------------------------------------------------------------------------

## 18. Architecture Decisions Still Open

These must be confirmed before locking implementation details:

1.  One old age home, multiple branches, or multi-organization SaaS.
2.  Expected resident count and staff accounts.
3.  Always-online or offline-capable operation.
4.  Existing repository and technology stack, if any.
5.  Existing authentication and database provider, if any.
6.  Hosting preference and budget.
7.  OCR/AI provider, data processing region and budget.
8.  English-only or bilingual UI; OCR languages.
9.  Public rescue/admission website scope.
10. Family portal scope.
11. Notification channels.
12. Legal retention and compliance requirements.

Until confirmed, the architecture assumes one organization initially,
branch-ready data ownership, online-first operation and
provider-independent integrations.

------------------------------------------------------------------------

## 19. Architecture Exit Criteria

Architecture is ready for implementation when: - Existing infrastructure
has been inspected. - Major modules and ownership boundaries are
agreed. - Organization/branch isolation strategy is documented. -
Database entities and key constraints are specified. - Permission matrix
is approved. - Sensitive data classification is documented. - Document
storage and AI review pipeline are defined. - Backup and restoration
strategy is testable. - API contracts for the first vertical slice are
approved. - Open decisions that affect foundational design are resolved
or explicitly accepted as assumptions.
