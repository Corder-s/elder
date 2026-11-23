# Product Requirements Document (PRD)

## ElderCare OS --- Old Age Home & Elderly Care Management Platform

  -----------------------------------------------------------------------
  Document field                      Value
  ----------------------------------- -----------------------------------
  Product name                        ElderCare OS (working name)

  Document type                       Product Requirements Document

  Version                             1.0

  Status                              Draft --- baseline for discovery
                                      and implementation

  Prepared on                         14 November 2026

  Primary users                       Old age home administrators, care
                                      staff, medical personnel, finance
                                      staff, volunteers and authorized
                                      family members
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 1. Executive Summary

ElderCare OS is a centralized management platform for an old age home or
elderly-care NGO. It will help the organization manage resident records,
rescue operations, admissions, healthcare information, daily care,
attendance, visitors, events, staff, documents, finances, compliance
tasks and reporting from one application.

The platform is intended to reduce paper registers, repeated data entry,
scattered files and manual report preparation. It must remain usable by
a small team or a single administrator while supporting additional staff
and branches in the future.

The system will combine: - Manual data entry and review. -
Permission-based automatic capture of suitable information, such as
timestamps and current device location. - OCR and AI-assisted extraction
from uploaded documents. - Reusable resident and organization records. -
Configurable digital forms generated from approved source documents. -
PDF and spreadsheet reports. - Reminders, task tracking and audit
history.

**Core principle:** Enter information once, verify it, and reuse it
wherever the user is authorized to do so.

AI-generated or automatically extracted information must be treated as a
draft until a responsible user verifies it. The platform must not make
clinical diagnoses, prescribe treatment, or silently submit official
forms.

------------------------------------------------------------------------

## 2. Problem Statement

Old age homes may maintain important information across paper files,
registers, spreadsheets, messaging applications and separate online
portals. This can lead to: - Repeated entry of the same resident
information. - Difficulty locating historical records. - Incomplete
rescue and admission histories. - Missed medical, document-renewal or
government-submission reminders. - Time-consuming visitor, attendance
and activity reporting. - Difficulty tracking medicines, appointments
and care observations. - Manual recreation of newly issued paper
forms. - Weak visibility into who changed or accessed sensitive records.

ElderCare OS will bring these workflows together while preserving
accountability, privacy and human oversight.

------------------------------------------------------------------------

## 3. Product Vision and Goals

### 3.1 Vision

Provide one dependable digital operating system for the administrative
and day-to-day operations of an old age home, with a clear resident
history from first contact or rescue through admission, care, transfer,
reunification or discharge.

### 3.2 Product goals

1.  Maintain a reliable, searchable record for every resident and rescue
    case.
2.  Digitize admissions, visitor registers, attendance and daily
    activity records.
3.  Organize organizational, resident, medical, legal and financial
    paperwork.
4.  Reduce repetitive data entry through reusable records and verified
    document extraction.
5.  Capture location and timestamps only with appropriate permission and
    context.
6.  Create digital forms from uploaded official or organizational paper
    forms, subject to review.
7.  Track upcoming events, appointments, deadlines, tasks and document
    expiry dates.
8.  Generate accurate operational and financial reports.
9.  Protect sensitive personal, identity and health information.
10. Support a single operator initially while allowing role-based
    collaboration and future expansion.

### 3.3 Success measures

The product should be measured using: - Percentage of active residents
with required profile information completed. - Time required to register
a rescue case or admission. - Time required to find a resident's
complete record. - Percentage of scheduled tasks and reminders completed
on time. - Time required to produce routine monthly reports. - OCR
extraction accuracy after human review. - Number of duplicate records
detected and resolved. - Backup restoration success. - Number of
unauthorized access attempts successfully blocked. - User-reported ease
of completing common daily workflows.

Targets will be set after observing the first real operating
environment.

------------------------------------------------------------------------

## 4. Scope

### 4.1 Included in the planned product

-   Dashboard and global search.
-   Resident and guardian records.
-   Rescue requests and rescue case management.
-   Admission, transfer, reunification and discharge workflows.
-   Medical records and care observations.
-   Medicine schedules and administration records.
-   Attendance and resident movement records.
-   Visitor registration and visit history.
-   Daily diary and activity reporting.
-   Events and calendar.
-   Staff, volunteer and doctor directories.
-   Rooms, beds and occupancy.
-   Food, nutrition and dietary requirements.
-   Inventory and maintenance.
-   Donations, donors, income and expenses.
-   Document vault and government/compliance records.
-   OCR and AI document intelligence.
-   AI-assisted document-to-form generation.
-   Dynamic form builder and form versioning.
-   PDF and spreadsheet generation.
-   Tasks, notifications and reminders.
-   Audit logs, access controls and backups.
-   Optional public website and public rescue/admission request forms.
-   Future family portal and multi-branch support.

### 4.2 Not included in the initial release unless separately approved

-   Autonomous medical diagnosis or treatment recommendations.
-   Automatic medicine prescribing or dose changes.
-   Unreviewed submission of government forms.
-   Automatic identity verification against government databases without
    an authorized integration.
-   Continuous tracking of residents, visitors or staff.
-   Guaranteed acceptance of AI-recreated forms by a government
    department.
-   Direct integration with every government portal.
-   Full accounting/ERP functionality unless requirements are expanded.
-   Emergency dispatch or guaranteed emergency response services.

------------------------------------------------------------------------

## 5. Users, Roles and Permissions

The system must support role-based access control (RBAC). Permissions
should be configurable by module and action, rather than relying only on
fixed role names.

  -----------------------------------------------------------------------
  Role                                Typical access
  ----------------------------------- -----------------------------------
  Super Admin                         Platform-wide configuration and
                                      administration

  NGO Administrator                   Organization operations and
                                      authorized records

  Doctor / Medical Officer            Medical records, appointments and
                                      clinical notes

  Nurse / Caretaker                   Assigned care observations and
                                      medicine administration

  Accountant                          Donations, receipts, expenses and
                                      financial reports

  Staff Member                        Assigned operational tasks and
                                      permitted records

  Volunteer                           Limited assigned activities

  Family / Guardian                   Only explicitly shared information
                                      for their linked resident

  Auditor / Inspector                 Time-limited, read-only access to
                                      approved records
  -----------------------------------------------------------------------

### Permission requirements

-   Deny access by default.
-   Enforce authorization on the backend for every protected action.
-   Restrict medical and identity documents to approved roles.
-   Support read, create, update, delete/archive, export and approve
    permissions separately.
-   Log access to sensitive records and documents.
-   Support account suspension and session revocation.
-   Family accounts must never expose other residents' information.
-   Volunteers must not receive broad resident or medical access by
    default.

------------------------------------------------------------------------

## 6. Information Architecture and Navigation

Proposed primary navigation:

1.  **Overview**
    -   Dashboard
    -   Calendar
    -   Notifications
2.  **Resident Care**
    -   Residents
    -   Admissions
    -   Medical Records
    -   Medicines
    -   Attendance
    -   Daily Diary
    -   Food & Nutrition
3.  **Rescue Operations**
    -   Rescue Cases
    -   New Rescue
    -   Public Rescue Requests
    -   Family Tracing
    -   Hospital Referrals
4.  **Daily Operations**
    -   Visitors
    -   Daily Activities
    -   Events
    -   Tasks
5.  **Facilities**
    -   Rooms & Beds
    -   Inventory
    -   Maintenance
6.  **People**
    -   Staff
    -   Volunteers
    -   Doctors
7.  **Documentation**
    -   Document Vault
    -   AI Document Intelligence
    -   Form Builder
    -   Government & Compliance Records
8.  **Finance**
    -   Donors
    -   Donations
    -   Expenses
    -   Receipts
9.  **Reports**
    -   Operational Reports
    -   Resident Reports
    -   Rescue Reports
    -   Medical Reports
    -   Financial Reports
    -   Compliance Reports
10. **Administration**
    -   Users
    -   Roles & Permissions
    -   Audit Logs
    -   Backup Status
    -   Settings

The navigation may be refined during UX design, but all modules must
remain discoverable and consistent.

------------------------------------------------------------------------

## 7. Functional Requirements

Priority definitions: - **P0:** Required for the first usable release. -
**P1:** Important follow-up capability. - **P2:** Future enhancement.

### 7.1 Dashboard and Command Centre

**P0** - Display counts for active residents, current admissions, open
rescue cases, today's visitors, attendance, pending tasks and upcoming
events. - Show upcoming appointments and document deadlines. - Provide
quick actions for new resident, rescue case, visitor entry, attendance
and daily update. - Show recently updated records, subject to
permissions. - Provide filters by date and branch where applicable.

**P1** - Customizable dashboard widgets. - Trend summaries and charts. -
AI-assisted natural-language reporting with permission-aware data
access.

### 7.2 Resident Management

**P0** - Create a unique resident ID. - Capture personal details,
photograph, contact information, address and emergency contacts. -
Record guardian/family details and relationship. - Record admission
source, admission date, current status, room and bed. - Upload and
categorize supporting documents. - Display a resident profile with
linked admission, rescue, attendance, visitor, medical, activity and
document history. - Search, filter, sort and export authorized resident
lists. - Prevent accidental duplicate records through possible-match
warnings. - Support corrections with an audit history.

**P1** - Family portal with explicit sharing controls. - Resident
profile completeness checklist. - Bulk import from approved spreadsheet
templates.

### 7.3 Rescue Management

**P0** - Create a rescue case with a unique Rescue ID. - Record known or
unknown identity, approximate age, gender, photograph and observed
condition. - Record rescue date/time, source, location, reporting person
and rescue team. - Capture current device location only after explicit
browser/device permission. - Store latitude, longitude, capture time,
accuracy (if provided) and manually confirmed address. - Allow address
entry or correction when GPS is unavailable or inaccurate. - Record
belongings, immediate needs, initial assessment, hospital referral and
costs. - Record police or external organization references where
applicable. - Maintain case notes, attachments and a chronological
timeline. - Support case statuses: New, Under Assessment, Hospitalized,
Family Tracing, Temporary Shelter, Admitted, Reunited, Referred and
Closed. - Convert an approved rescue case into an admission/resident
record without retyping existing verified data.

**P1** - Public rescue request form with triage queue. - Map view of
authorized rescue records. - Family tracing contact log and follow-up
schedule. - Rescue team and vehicle directory.

**Safety and privacy** - Do not publish exact rescue locations or
identities publicly by default. - Record consent, legal basis or other
applicable authorization for collecting and sharing personal data. -
Treat mental/physical condition as observations by authorized personnel,
not automated diagnoses.

### 7.4 Admission Management

**P0** - Create an admission from a direct application or an existing
rescue case. - Capture personal, guardian, emergency, medical and
administrative details. - Track required documents and missing
information. - Support draft, submitted, under review, approved,
rejected and withdrawn statuses. - Record approval decisions and
responsible users. - Allocate room and bed after approval. - Generate
admission summary, agreement and receipt templates. - Generate a
printable PDF and preserve the submitted data snapshot.

**P1** - Public online admission application. - Configurable admission
criteria and checklist. - Digital acknowledgement/signature integration
where legally suitable.

### 7.5 Medical and Healthcare Records

**P0** - Store medical history, allergies, conditions, prescriptions,
reports and hospital documents. - Record observations such as blood
pressure, blood sugar, temperature, weight and notes, including units,
date/time and recorder. - Record doctor details, appointments,
recommendations and follow-up dates. - Maintain hospital visit, transfer
and discharge records. - Restrict medical information to authorized
roles. - Maintain a clear history of edits and corrections.

**P1** - Configurable health observation charts. - Medical appointment
reminders. - Structured clinical document templates.

**Safety** - The application is a record-keeping and workflow tool, not
a diagnostic device. - AI may extract or summarize source documents but
must identify the source and require human review. - AI must not
prescribe, change a medicine dose or decide treatment. - Emergency
guidance must direct staff to the organization's approved emergency
procedures and local emergency services.

### 7.6 Medicine Management

**P0** - Record medicine name, prescribed instructions, dosage as
entered by an authorized clinician, schedule, start/end dates and
prescribing source. - Create administration schedule. - Record
administered, missed, refused or withheld status with time and
responsible staff member. - Record reason and notes for
missed/refused/withheld doses. - Track stock quantity and expiry date
where inventory is enabled. - Generate low-stock and expiry alerts.

**P1** - Barcode-assisted stock entry. - Medicine administration charts
and printable registers.

The system must not infer a dosage from OCR or AI and activate it
without verification by an authorized medical professional.

### 7.7 Attendance, Movement and Daily Care

**P0** - Record daily attendance with date/time and responsible user. -
Support present, absent, on leave, hospitalized and outside-premises
statuses as configured. - Record departure and return time for residents
leaving the premises. - Capture destination, reason and accompanying
person where appropriate. - Record daily care observations and shift
notes. - Maintain individual attendance and activity history.

**P1** - Bulk attendance entry. - Recurring care checklists. - Optional
tablet-friendly attendance screen.

Attendance must not be represented as proof of a resident's exact
physical location.

### 7.8 Visitor Management

**P0** - Register visitor name, contact details, address (if required),
purpose, resident visited and relationship. - Capture entry and exit
timestamps automatically, with manual correction permission and audit
history. - Optionally capture a visitor photograph only with appropriate
notice and consent. - Record belongings or other visit notes only where
operationally necessary. - Search previous visits and generate
daily/monthly visitor reports.

**P1** - Visitor pre-registration. - QR-based check-in, subject to
privacy review. - Configurable visitor policies and alerts.

### 7.9 Events, Calendar and Activities

**P0** - Create events with title, type, date/time, location,
description and expected participants. - Assign responsible staff and
tasks. - Record guests, budget and supporting documents. - Record
attendance/participation and actual expenses. - Upload photographs and
post-event report. - Track upcoming, completed, postponed and cancelled
events. - Calendar must also show appointments, tasks, document
deadlines and important dates.

**P1** - Event invitation generation. - Public event listing with
explicit publishing controls. - Recurring events.

### 7.10 Daily Diary and Activity Register

**P0** - Create dated daily updates. - Record completed and pending
work, resident activities, participation counts and important
observations. - Attach photographs or documents where authorized. - Link
entries to relevant residents, events or tasks. - Generate daily, weekly
and monthly summaries.

**P1** - AI draft summary based only on selected records, with human
review before publishing.

### 7.11 Food and Nutrition

**P0** - Maintain meal menus by date and meal. - Record
resident-specific dietary requirements and allergies. - Store
recommendations and their source. - Record meal distribution or
exceptions where required.

**P1** - Food stock and consumption tracking. - Menu planning calendar.

### 7.12 Staff, Volunteers and Doctors

**P0** - Maintain profiles, contact details, roles, joining dates and
relevant documents. - Record attendance, shifts, leave and assigned
responsibilities. - Link doctors to appointments and medical entries. -
Track volunteer assignments and completed activities. - Restrict
personnel records to authorized users.

**P1** - Duty roster and shift handover. - Salary and payroll export
(not full payroll in the initial release).

### 7.13 Rooms, Beds and Facilities

**P0** - Maintain buildings/floors/rooms/beds where relevant. - Record
capacity, availability, occupancy and maintenance status. - Prevent
assigning the same bed to multiple active residents. - Maintain
allocation and transfer history.

**P1** - Maintenance schedules and asset register. - Room inspection
checklist.

### 7.14 Inventory and Maintenance

**P1** - Maintain item catalogue, categories, quantities, units,
suppliers and stock movements. - Track medicines, food and general
supplies separately where needed. - Record purchase, issue, consumption,
adjustment and disposal. - Generate low-stock alerts. - Record
maintenance requests, priority, assigned person, status, costs and
completion evidence.

### 7.15 Finance, Donors and Donations

**P0** - Maintain donor profiles and donation records. - Record date,
amount, payment mode, purpose/restriction and reference. - Generate
sequential receipts using configurable templates. - Record expenses with
category, date, amount, payee, notes and supporting invoice. - Attach
supporting documents. - Produce income, expense and donation summaries.

**P1** - Budget tracking. - Fund/project-wise utilization. - Accounting
software export.

The application must not claim a donation is tax-deductible or issue a
statutory tax certificate unless the organization's eligibility and
applicable rules have been verified.

### 7.16 Document Vault and Compliance

**P0** - Upload, preview, download and categorize files. - Link
documents to residents, rescue cases, staff, events, finance or
organization records. - Store original file, upload metadata, uploader,
date and version. - Search by document name, category, linked record and
extracted text where available. - Record issue date, expiry date,
issuing authority and reference number when applicable. - Provide expiry
and renewal reminders. - Support private access controls and audit logs.

**P1** - Compliance calendar. - Renewal task generation. - Configurable
document retention policies.

### 7.17 AI Document Intelligence

**P0** - Accept supported PDFs and images. - Extract embedded PDF text
where possible; use OCR for scanned pages/images. - Identify likely
document type and language. - Extract candidate fields with page/source
references and confidence indicators where supported. - Map candidate
fields to the selected resident or organizational record. - Display a
side-by-side source and extracted-data review screen. - Allow
correction, rejection and approval field by field. - Preserve original
documents and extraction history. - Never silently overwrite verified
data. - Flag possible duplicate documents/records for review.

**P1** - Hindi and English document support, with handwriting support
where the selected engine can reliably process it. - Batch processing. -
AI summaries of long documents, clearly labeled as generated
summaries. - Additional language support based on observed needs.

### 7.18 AI Document-to-Form Generator

**P0** - Allow an administrator to upload a blank official or internal
paper form. - Analyze pages, headings, fields, checkboxes, tables and
instructions. - Generate a draft digital form with field labels, types,
required flags and help text. - Allow an administrator to edit field
definitions, order, validation and mapping. - Preserve the original
source document and its metadata. - Require human review and approval
before publishing. - Support a modern web form and a print/PDF output. -
Where possible, create a PDF aligned with the original layout; clearly
flag layouts that cannot be reproduced faithfully. - Keep form
submissions linked to the form version used.

**P1** - Compare new form versions with prior versions. - Identify
added, removed and modified fields. - Keep old versions available for
historical submissions. - Map fields to existing resident data with user
approval.

**Important limitations** - The system cannot assume every uploaded
document is authentic or current. - The administrator must record
issuing authority, source and effective date where known. - AI-created
forms are drafts, not proof of government approval. - The generated PDF
must be checked against the original and the receiving authority's
requirements before official use. - A form should not be published based
only on an AI confidence score.

### 7.19 Tasks, Notifications and Reminders

**P0** - Create tasks with title, description, owner, due date, priority
and status. - Support recurring tasks. - Link tasks to residents, cases,
documents, events or finance records. - Generate reminders for
appointments, document expiry, follow-ups and deadlines. - Show overdue,
due today and upcoming tasks. - Maintain task completion history.

**P1** - Email/SMS/WhatsApp notifications through approved providers. -
Escalation rules and notification preferences.

### 7.20 Reports and Exports

**P0** - Daily/monthly resident summary. - Admission and discharge
report. - Rescue case report. - Attendance report. - Visitor register. -
Daily activity report. - Event report. - Medical appointment and
medicine administration report, permission restricted. - Donation and
expense report. - Staff attendance report. - Document expiry and
compliance report. - PDF, spreadsheet and print output. - Date, status
and branch filters where relevant.

**P1** - Configurable report builder. - Scheduled report generation. -
AI-assisted report drafting with source records and human approval.

### 7.21 Global Search and AI Assistant

**P0** - Search residents, rescue cases, visitors, documents, events and
tasks according to user permissions. - Support exact ID and name
search. - Provide useful filters and links to matching records.

**P1** - Natural-language questions such as: - "Which documents expire
next month?" - "Show open rescue cases." - "How many admissions were
completed this month?" - "Prepare a draft monthly activity report."

The assistant must enforce the same permissions as the application,
cite/link the records it used, distinguish facts from generated
summaries and ask for confirmation before making changes or sending
information.

------------------------------------------------------------------------

## 8. Key End-to-End Workflows

### 8.1 Rescue to Resident Admission

1.  User creates a rescue case.
2.  System generates Rescue ID and records the operator and timestamp.
3.  User captures location with permission or enters it manually.
4.  User records observations and uploads available documents.
5.  Medical assistance and hospital referrals are logged.
6.  Family tracing and follow-ups are recorded.
7.  Case is moved to temporary shelter, admission, reunification,
    referral or closure.
8.  If admission is approved, the system creates/links a resident
    profile and reuses verified information.
9.  All rescue history remains linked and auditable.

### 8.2 New Resident Admission

1.  User starts a direct admission or selects an existing rescue case.
2.  User enters information manually or uploads supporting documents.
3.  OCR proposes extracted values.
4.  User verifies each field.
5.  Required information and documents are checked.
6.  Authorized user approves or rejects the application.
7.  Room and bed are allocated.
8.  Admission documents and receipt are generated.
9.  Resident profile becomes active.

### 8.3 Document Upload and Data Extraction

1.  User uploads a document.
2.  System validates file type, size and security.
3.  System stores the original in private storage.
4.  Text extraction/OCR runs asynchronously.
5.  AI proposes document type and fields.
6.  User reviews source and extracted values.
7.  Approved values are saved to the selected record.
8.  Original document, extraction result and approval history remain
    available.

### 8.4 Official Paper to Digital Form

1.  Administrator uploads the blank form and records its source.
2.  System extracts text and analyzes layout.
3.  Form builder creates a draft.
4.  Administrator compares the draft with the original.
5.  Administrator adjusts fields, validation and PDF layout.
6.  Authorized administrator approves and publishes a version.
7.  User completes the digital form.
8.  System generates a PDF and stores the submission with its form
    version.
9.  Revised forms create new versions; historical submissions remain
    unchanged.

### 8.5 Daily Operations

1.  Dashboard displays today's attendance, visitors, appointments, tasks
    and events.
2.  Operator records attendance and visitor entries.
3.  Staff add care observations and daily activities.
4.  Tasks and follow-ups are updated.
5.  System creates daily summaries and reports.
6.  Authorized user reviews and finalizes the daily report.

------------------------------------------------------------------------

## 9. Data and Record Management Principles

-   Each major record must have a stable unique identifier.
-   Use relational links rather than copying the same information into
    unrelated tables.
-   Store original documents separately from extracted text and
    structured data.
-   Record who created, updated, approved, exported or archived
    important records.
-   Preserve historical form versions and submitted form snapshots.
-   Use soft deletion/archive for operational records where legally
    appropriate.
-   Corrections to important records must preserve an audit trail.
-   Store timestamps consistently and display them in the organization's
    configured timezone.
-   Store date-only values separately from timestamps.
-   Use configurable categories and statuses where workflows may differ
    by organization.
-   Support CSV/XLSX import through validated templates, with preview
    and error reporting.
-   Provide export and data portability for authorized administrators.
-   Define retention and deletion policies with legal review before
    production.

------------------------------------------------------------------------

## 10. Non-Functional Requirements

### 10.1 Security and privacy

-   HTTPS for all network communication.
-   Secure password hashing and appropriate session management.
-   Optional multi-factor authentication for privileged users.
-   Backend-enforced RBAC and record-level access.
-   Private object storage; no public links for sensitive documents.
-   Encryption at rest where supported by the deployment environment.
-   Signed, short-lived download links where appropriate.
-   File type validation, size limits and malware scanning.
-   Rate limiting and abuse protection.
-   Audit logs for sensitive access and changes.
-   Data minimization, consent/notice and lawful processing workflows.
-   Mask identity numbers in normal views and exports unless full access
    is necessary.
-   No sensitive resident data in application logs, analytics or AI
    prompts beyond what is required and authorized.
-   Review applicable Indian privacy, health-record, identity-document
    and NGO compliance obligations with qualified counsel.

### 10.2 Reliability and backups

-   Automated database backups.
-   Separate backup of uploaded documents and object metadata.
-   Encrypted backup storage.
-   Documented restore procedure.
-   Regular restoration drills.
-   Monitoring for failed backups and storage errors.
-   Recovery objectives to be agreed before production.

### 10.3 Performance and usability

-   Responsive interface for desktop, tablet and mobile.
-   Paginated/searchable tables.
-   Background processing for OCR, exports and large uploads.
-   Clear loading, empty, error and success states.
-   Autosave drafts for long forms where safe.
-   Avoid losing form progress on navigation or refresh.
-   Accessible labels, keyboard navigation and readable contrast.
-   Simple language and minimal steps for common daily tasks.

### 10.4 Scalability and maintainability

-   Modular backend boundaries.
-   Versioned APIs.
-   Database migrations under source control.
-   Automated tests and CI checks.
-   Centralized error handling and structured logging.
-   Configurable organization settings.
-   Branch-aware data model, even if only one branch is initially
    enabled.

### 10.5 Offline support

Offline operation is not yet confirmed. The initial architecture should
avoid assumptions that prevent future offline capture, but offline
synchronization should not be implemented until its scope, conflict
rules and device security are agreed.

------------------------------------------------------------------------

## 11. Suggested Technical Direction

The following is a proposed stack, subject to repository and environment
discovery before implementation.

  -----------------------------------------------------------------------
  Layer                               Proposed technology
  ----------------------------------- -----------------------------------
  Frontend                            Next.js / React

  Backend                             NestJS

  Database                            PostgreSQL

  ORM                                 Prisma

  Authentication                      Secure session or token-based
                                      authentication with RBAC

  File storage                        Private S3-compatible object
                                      storage

  OCR                                 Pluggable OCR provider supporting
                                      PDF and image processing

  AI extraction                       Provider-independent document
                                      intelligence service

  Maps                                Map provider selected after cost,
                                      coverage and privacy review

  Background jobs                     Queue/worker architecture for OCR,
                                      reminders and exports

  PDF generation                      Server-side PDF generation

  Spreadsheet exports                 XLSX generation

  Testing                             Unit, integration and end-to-end
                                      tests

  Deployment                          To be selected after local
                                      development and security
                                      requirements are confirmed
  -----------------------------------------------------------------------

The implementation must first inspect any existing repository and
preserve working infrastructure where appropriate. Do not replace
authentication, database or hosting choices without explicit approval.

------------------------------------------------------------------------

## 12. Initial Release Plan

Development should be backend-first, with working vertical slices and
real database integration. The team should not build a large set of
static screens backed by dummy data.

### Phase 0 --- Discovery and system design

-   Confirm organization size, branches and user types.
-   Confirm current record-keeping process.
-   Confirm internet/offline needs.
-   Confirm public website and family portal scope.
-   Confirm privacy, consent and retention requirements.
-   Create architecture, data model, workflows and API standards.

**Exit criteria:** Requirements and data model approved.

### Phase 1 --- Platform foundation

-   Repository and environment setup.
-   Database and migrations.
-   Authentication and RBAC.
-   Organization and branch model.
-   Audit logging.
-   Secure file storage.
-   Validation and error handling.
-   Backup and restore baseline.

**Exit criteria:** Secure login, permissions, audit events, file upload
and tested database backup/restore.

### Phase 2 --- Core records

-   Resident management.
-   Rescue case management.
-   Admission workflow.
-   Guardian and emergency contacts.
-   Room and bed allocation.
-   Document attachments.

**Exit criteria:** A rescue case can become an admission and resident
profile without re-entering verified information.

### Phase 3 --- Daily operations and care

-   Medical records.
-   Medicine schedules and administration.
-   Attendance and resident movement.
-   Visitor register.
-   Daily diary and activities.
-   Appointments and events.
-   Tasks and reminders.

**Exit criteria:** A complete daily operating workflow works using real
records.

### Phase 4 --- Documents and intelligence

-   Document vault.
-   OCR pipeline.
-   Review and approval interface.
-   AI field mapping.
-   Dynamic form builder.
-   Official form versioning.
-   PDF generation.

**Exit criteria:** A user can upload a sample document, verify extracted
data, create a draft form from a sample blank form and generate a
reviewed PDF.

### Phase 5 --- Finance and organization operations

-   Donors and donations.
-   Expenses and receipts.
-   Staff and volunteers.
-   Inventory and maintenance.
-   Food and nutrition.
-   Compliance tracker.

**Exit criteria:** Core operational and finance reports reconcile with
source records.

### Phase 6 --- Frontend completion and integration

-   Complete responsive application UI.
-   Dashboard and navigation.
-   Global search.
-   Role-specific experiences.
-   Notification centre.
-   Public forms if approved.
-   End-to-end integration.

**Exit criteria:** No critical workflow depends on dummy data or
placeholder actions.

### Phase 7 --- Quality, security and release readiness

-   Unit and integration tests.
-   End-to-end workflow tests.
-   Permission and privacy tests.
-   File upload security tests.
-   Performance tests.
-   Backup restoration drill.
-   User acceptance testing.
-   Operational documentation.

**Exit criteria:** Critical defects resolved, restore tested, and
administrator sign-off received.

------------------------------------------------------------------------

## 13. MVP Definition

The first usable release should prioritize the workflows that make the
old age home operationally manageable.

### MVP must include

1.  Authentication and roles.
2.  Dashboard.
3.  Resident profiles.
4.  Rescue cases.
5.  Admission workflow.
6.  Room and bed allocation.
7.  Document upload and vault.
8.  Visitor register.
9.  Attendance.
10. Daily activity register.
11. Events and calendar.
12. Basic medical records and appointments.
13. Tasks and reminders.
14. Basic PDF/Excel reports.
15. Audit logs and backups.

### Post-MVP

-   Medicine inventory and advanced administration workflows.
-   AI document extraction at scale.
-   AI-generated dynamic forms and version comparison.
-   Finance and donor management enhancements.
-   Family portal.
-   Public rescue and admission portal.
-   Advanced inventory, maintenance and analytics.
-   Offline synchronization.
-   Multi-branch operations.

The MVP may be adjusted after discovery, but healthcare safety, privacy,
auditability and backup requirements are not optional.

------------------------------------------------------------------------

## 14. Acceptance Criteria

The product is not considered complete merely because a page or button
exists.

A feature is complete only when: - The user can perform the intended
action. - Data is validated on the backend. - Data persists correctly in
PostgreSQL. - Permissions are enforced on the backend. - Errors are
understandable and recoverable. - Loading, empty and success states are
implemented. - Relevant actions are audited. - Linked records update
consistently. - Tests cover normal, invalid, unauthorized and failure
scenarios. - The feature works with real records, not hard-coded demo
data.

### Critical end-to-end acceptance scenarios

1.  Create a rescue case, capture permitted location, upload a document
    and review its extracted data.
2.  Convert an approved rescue case into a resident admission without
    duplicate resident records.
3.  Allocate a bed and prevent double allocation.
4.  Record attendance and a visitor entry and retrieve both from the
    resident's history where applicable.
5.  Upload a medical document and require authorized review before
    structured medical data is saved.
6.  Create a medicine schedule from an authorized prescription and
    record administration without AI changing the prescribed
    instructions.
7.  Upload a blank official form, generate a draft digital form, review
    it, publish a version and create a PDF submission.
8.  Generate a monthly report and verify it against the underlying
    records.
9.  Confirm a user without medical permission cannot view medical
    records or download medical documents.
10. Restore a backup and verify that database records and associated
    documents remain linked.

------------------------------------------------------------------------

## 15. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Incorrect OCR extraction            Side-by-side review, confidence
                                      indicators and field-level approval

  AI-generated form differs from      Preserve source, compare layout and
  official form                       require administrator verification

  Sensitive data exposure             Least-privilege access, private
                                      storage, masking and audit logs

  Duplicate resident profiles         Possible-match detection and
                                      controlled merge workflow

  Incorrect medicine information      Authorized medical entry and
                                      review; no autonomous prescribing

  GPS unavailable or inaccurate       Manual location entry and visible
                                      accuracy/source metadata

  Internet interruption               Draft preservation; offline sync
                                      only after requirements are
                                      approved

  Scope becomes too large             Deliver phased MVP and prioritize
                                      real operational workflows

  Government rules change             Versioned compliance records and
                                      human confirmation of current
                                      requirements

  Vendor lock-in                      Provider-independent OCR/AI
                                      interfaces and exportable data
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 16. Open Decisions Requiring Confirmation

These items must be confirmed before final architecture and production
configuration. Until then, use the stated assumptions only for planning.

  -----------------------------------------------------------------------
  Decision                Options / question      Planning assumption
  ----------------------- ----------------------- -----------------------
  Organization scope      One home, multiple      One organization
                          branches, or            initially; branch-ready
                          multi-organization      data model
                          SaaS?                   

  Capacity                Expected number of      Unknown; design for
                          residents?              configurable capacity

  Operators               One administrator or    One primary operator
                          multiple staff roles?   with RBAC support

  Public website          Is a public NGO site    Separate optional scope
                          required?               

  Public rescue requests  Can the public submit   Optional, with admin
                          requests?               review

  Online admission        Can family members      Manual and online-ready
                          apply online?           workflow

  Family portal           Should guardians log    Post-MVP
                          in?                     

  Internet                Always online or        Online-first; offline
                          intermittent            needs to be confirmed
                          connectivity?           

  Languages               English, Hindi or both? English and Hindi-ready
                                                  UX/OCR

  Maps                    Preferred map provider? Select after cost and
                                                  privacy review

  OCR/AI provider         Preferred provider and  Provider-independent
                          budget?                 integration

  Hosting                 Local server, cloud or  Decide after
                          existing hosting?       infrastructure
                                                  discovery

  Notifications           Email, SMS, WhatsApp or In-app first; external
                          in-app?                 channels later

  Legal/compliance        Which state,            Must be confirmed by
                          registration type and   the organization and
                          reporting obligations   qualified adviser
                          apply?                  
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 17. Immediate Next Steps

1.  Treat this PRD as the product baseline.
2.  Confirm the open decisions in Section 16.
3.  Inspect the existing code repository, if one exists, before creating
    or replacing infrastructure.
4.  Produce `architecture.md`, `database-schema.md` and
    `api-specification.md`.
5.  Create the initial database migrations and RBAC foundation.
6.  Implement the first vertical slice: resident records, rescue cases,
    admission and secure document upload.
7.  Test the complete workflow before expanding into the next modules.

### Initial implementation rule

Do not start by generating every page. Start with the data model and a
working end-to-end backend workflow. Then build the interface around
verified functionality.

------------------------------------------------------------------------

## 18. Definition of Product Success

ElderCare OS succeeds when an authorized operator can manage the old age
home's essential daily work from one platform, find a resident's
complete and accurate history quickly, maintain reliable rescue and care
records, handle paperwork with less repeated effort, and produce
trustworthy reports without relying on disconnected registers and
spreadsheets.

**Product promise:** One platform. Connected records. Less repetitive
work. More time for elderly care.
