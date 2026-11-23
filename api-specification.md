# ElderCare OS — API Specification
## REST API Contract v1.0

**Status:** Initial contract proposal. Final request/response schemas should be represented in OpenAPI and reviewed alongside backend implementation.

## 1. API conventions

- Base path: `/api/v1`
- Content type: `application/json` unless uploading files.
- Authentication: secure session or approved token mechanism.
- Authorization: backend RBAC and record-level checks on every request.
- IDs: UUID strings.
- Timestamps: ISO 8601 with timezone; server stores UTC.
- Date-only values: `YYYY-MM-DD`.
- Pagination: cursor or page-based, consistently applied.
- All list endpoints must be scoped to the caller's organization and authorized branches.
- Do not expose internal storage object keys or provider secrets.

## 2. Standard response shapes

### Single resource
```json
{
  "data": {
    "id": "uuid",
    "createdAt": "2026-11-14T10:00:00Z"
  }
}
```

### Paginated collection
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 0,
    "hasNextPage": false
  }
}
```

### Error
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Please review the submitted information.",
  "details": [],
  "requestId": "correlation-id"
}
```

Never return stack traces, SQL statements, secrets or sensitive internal data.

## 3. Authentication and current user

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate user |
| POST | `/auth/logout` | Revoke current session |
| POST | `/auth/refresh` | Refresh session if token-based auth is selected |
| POST | `/auth/forgot-password` | Start account recovery |
| POST | `/auth/reset-password` | Complete verified account recovery |
| GET | `/auth/me` | Current user and effective permissions |

Authentication details depend on the selected identity provider. Avoid implementing custom cryptography or storing raw session tokens.

## 4. Users, roles and permissions

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/users` | List users |
| POST | `/users` | Create/invite user |
| GET | `/users/{id}` | User details |
| PATCH | `/users/{id}` | Update user |
| POST | `/users/{id}/suspend` | Suspend account |
| GET | `/roles` | List roles |
| POST | `/roles` | Create configurable role |
| PATCH | `/roles/{id}` | Update role |
| PUT | `/users/{id}/role-assignments` | Assign scoped roles |
| GET | `/permissions` | List permission catalogue |

Only privileged administrators may manage roles and permissions. Prevent users from granting themselves higher privileges.

## 5. Organization and branches

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/organization` | Organization profile |
| PATCH | `/organization` | Update organization |
| GET | `/branches` | List accessible branches |
| POST | `/branches` | Create branch |
| GET | `/branches/{id}` | Branch details |
| PATCH | `/branches/{id}` | Update branch |

Branch creation may be disabled in the first single-home deployment without changing the data model.

## 6. Residents

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/residents` | Search/list residents |
| POST | `/residents` | Create resident |
| GET | `/residents/{id}` | Resident profile |
| PATCH | `/residents/{id}` | Update resident |
| GET | `/residents/{id}/timeline` | Authorized combined history |
| GET | `/residents/{id}/contacts` | Contacts |
| POST | `/residents/{id}/contacts` | Add contact |
| PATCH | `/residents/{id}/contacts/{contactId}` | Update contact |
| POST | `/residents/{id}/archive` | Archive with reason |
| GET | `/residents/possible-duplicates` | Review possible matches |

Do not return medical details in the general resident endpoint unless the caller has the required medical permission.

## 7. Rescue cases

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/rescue-cases` | Search/list cases |
| POST | `/rescue-cases` | Create case |
| GET | `/rescue-cases/{id}` | Case details |
| PATCH | `/rescue-cases/{id}` | Update case |
| POST | `/rescue-cases/{id}/locations` | Add GPS/manual location |
| POST | `/rescue-cases/{id}/team-members` | Add team member |
| POST | `/rescue-cases/{id}/follow-ups` | Add follow-up |
| POST | `/rescue-cases/{id}/family-tracing-attempts` | Log tracing attempt |
| POST | `/rescue-cases/{id}/referrals` | Record referral |
| POST | `/rescue-cases/{id}/status-transitions` | Change case status |
| POST | `/rescue-cases/{id}/convert-to-admission` | Start linked admission |

Location payload example:
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracyMeters": 25,
  "addressText": "Operator-confirmed address",
  "captureSource": "gps",
  "capturedAt": "2026-11-14T10:00:00Z"
}
```
The browser obtains location only after a user action and permission. The backend validates ranges and records the actor. Never accept arbitrary location as verified GPS without provenance.

## 8. Admissions

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admissions` | List applications |
| POST | `/admissions` | Create application |
| GET | `/admissions/{id}` | Application details |
| PATCH | `/admissions/{id}` | Update draft |
| POST | `/admissions/{id}/submit` | Submit application |
| POST | `/admissions/{id}/review` | Approve/reject/request information |
| POST | `/admissions/{id}/allocate-bed` | Allocate bed |
| POST | `/admissions/{id}/discharge` | Record discharge |

Approval and bed allocation must be transactional and permission-checked.

## 9. Medical and medication

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/residents/{id}/medical-records` | List authorized medical records |
| POST | `/residents/{id}/medical-records` | Create medical record |
| POST | `/residents/{id}/observations` | Add health observation |
| GET | `/residents/{id}/appointments` | List appointments |
| POST | `/residents/{id}/appointments` | Create appointment |
| POST | `/residents/{id}/prescriptions` | Record verified prescription |
| POST | `/prescriptions/{id}/verify` | Verify prescription |
| POST | `/prescriptions/{id}/schedules` | Create medicine schedule |
| GET | `/medication-schedules` | List due schedules |
| POST | `/medication-schedules/{id}/administrations` | Record administration event |
| GET | `/residents/{id}/hospital-visits` | Hospital history |
| POST | `/residents/{id}/hospital-visits` | Record hospital visit |

Medical routes require explicit medical permissions. OCR suggestions cannot create active medication schedules without authorized verification.

## 10. Attendance and movement

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/attendance` | Search attendance |
| POST | `/attendance` | Record attendance |
| POST | `/attendance/bulk` | Bulk attendance |
| PATCH | `/attendance/{id}` | Correct attendance with audit |
| GET | `/residents/{id}/movements` | Movement history |
| POST | `/residents/{id}/movements` | Record departure/outside status |
| POST | `/movements/{id}/return` | Record return |

Use idempotency or uniqueness constraints to prevent duplicate daily attendance records.

## 11. Visitors

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/visitors` | Search visitor directory |
| POST | `/visitors` | Register visitor |
| GET | `/visits` | Search visits |
| POST | `/visits` | Check in visitor |
| POST | `/visits/{id}/checkout` | Record exit |
| GET | `/residents/{id}/visits` | Authorized resident visit history |

## 12. Events, activities and calendar

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/events` | List events |
| POST | `/events` | Create event |
| GET | `/events/{id}` | Event details |
| PATCH | `/events/{id}` | Update event |
| POST | `/events/{id}/participants` | Add participants |
| POST | `/events/{id}/complete` | Complete event |
| GET | `/activities` | List daily activity entries |
| POST | `/activities` | Create daily entry |
| GET | `/calendar` | Combined authorized calendar feed |

## 13. Staff, rooms and facilities

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/staff` | List/create staff |
| GET/PATCH | `/staff/{id}` | View/update staff |
| GET/POST | `/volunteers` | List/create volunteers |
| GET/POST | `/rooms` | List/create rooms |
| GET/POST | `/beds` | List/create beds |
| POST | `/beds/{id}/allocations` | Allocate bed |
| POST | `/bed-allocations/{id}/end` | End allocation |
| GET/POST | `/maintenance-requests` | List/create maintenance request |

The backend must prevent overlapping active allocations for one bed.

## 14. Documents and document intelligence

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/documents/upload-intents` | Request scoped upload authorization |
| POST | `/documents/complete-upload` | Finalize and validate upload |
| GET | `/documents` | Search authorized documents |
| GET | `/documents/{id}` | Document metadata |
| POST | `/documents/{id}/links` | Link to authorized record |
| DELETE | `/documents/{id}/links/{linkId}` | Remove link if permitted |
| POST | `/documents/{id}/extraction-jobs` | Start OCR/AI extraction |
| GET | `/extraction-jobs/{id}` | Job status |
| GET | `/extraction-jobs/{id}/fields` | Candidate extracted fields |
| POST | `/extraction-jobs/{id}/review` | Approve/correct/reject fields |
| GET | `/documents/{id}/download` | Create short-lived authorized download |

The API must validate file content, size, malware scan result where available and caller permissions. Do not expose permanent object-storage URLs.

## 15. Dynamic forms

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/forms` | List forms |
| POST | `/forms` | Create form definition |
| GET | `/forms/{id}` | Form details |
| POST | `/forms/{id}/draft-versions` | Create draft version |
| PATCH | `/form-versions/{id}` | Edit draft schema/layout |
| POST | `/form-versions/{id}/validate` | Validate fields and layout |
| POST | `/form-versions/{id}/approve` | Approve version |
| POST | `/form-versions/{id}/publish` | Publish immutable version |
| POST | `/form-versions/{id}/submissions` | Submit form |
| GET | `/form-submissions/{id}` | Submission details |
| POST | `/form-submissions/{id}/generate-pdf` | Generate output PDF |

Published versions must not be edited in place. A revised form creates a new version.

## 16. Finance, tasks and reports

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/donors` | List/create donors |
| GET/POST | `/donations` | List/create donations |
| POST | `/donations/{id}/issue-receipt` | Issue receipt |
| GET/POST | `/expenses` | List/create expenses |
| GET/POST | `/tasks` | List/create tasks |
| PATCH | `/tasks/{id}` | Update task |
| POST | `/tasks/{id}/complete` | Complete task |
| GET | `/notifications` | List in-app notifications |
| POST | `/notifications/{id}/read` | Mark read |
| POST | `/reports` | Start report job |
| GET | `/reports/{id}` | Report job status |
| GET | `/reports/{id}/download` | Authorized report download |

Exports must apply the same record-level and field-level permissions as the underlying screens.

## 17. Audit and administration

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/audit-events` | Search audit events |
| GET | `/system/health` | Health status for authorized operators |
| GET | `/system/backup-status` | Backup status |
| POST | `/system/backup-restore-drills` | Start controlled restore drill if supported |

Audit events should be append-only for normal application users.

## 18. Filtering and pagination

Common list query parameters:
- `page`
- `pageSize`
- `sortBy`
- `sortOrder`
- `search`
- `status`
- `from`
- `to`
- `branchId`

Only explicitly supported fields may be sorted or filtered. Never pass user-supplied column names directly into SQL/ORM expressions.

## 19. Idempotency and concurrency

Use idempotency keys for:
- Public rescue submissions.
- Donation receipt creation.
- Form submissions.
- Payment callbacks if payments are added.
- Retryable create requests.

Use database transactions for:
- Admission approval plus bed allocation.
- Rescue conversion to admission.
- Receipt number allocation.
- Form publication.
- Medicine administration creation.
- Bed allocation changes.

## 20. API acceptance checklist

- Every protected endpoint checks authentication and authorization.
- Every organization-owned object is scoped to the caller's organization.
- Cross-branch access follows explicit permissions.
- Sensitive fields are omitted or masked when not needed.
- Pagination and validation are consistent.
- Upload/download access is private and time-limited.
- Errors do not disclose internal details.
- Audit events are emitted for sensitive operations.
- API contract tests cover normal, invalid and unauthorized cases.
- OpenAPI documentation is generated from the implemented contracts.
