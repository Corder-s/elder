# ElderCare OS — Security and Privacy Baseline
## Security Requirements v1.0

## 1. Purpose

ElderCare OS processes personal information, identity documents, health information, family contacts, rescue details and financial records. Security and privacy controls are mandatory product requirements, not optional enhancements.

This document is an engineering baseline, not legal advice. The organization must obtain qualified advice on applicable Indian privacy, health, identity-document, NGO and record-retention obligations before production use.

## 2. Data classification

| Classification | Examples | Minimum controls |
|---|---|---|
| Public | Approved public event details, NGO contact details | Publication approval |
| Internal | Routine tasks, non-sensitive operational notes | Authenticated access |
| Confidential | Resident profile, family contacts, staff records, visitor logs | Role and record-level access |
| Restricted | Medical records, identity numbers, rescue location, sensitive legal documents | Explicit permissions, masking, access audit, private storage |

Classification may be made stricter by organization policy.

## 3. Identity and access

- Deny access by default.
- Use a vetted authentication provider or secure session implementation.
- Never store plaintext passwords.
- Use secure, HttpOnly, SameSite cookies for browser sessions where appropriate.
- Require strong authentication for privileged users.
- Offer MFA for administrators and other high-risk roles.
- Revoke sessions when an account is suspended or credentials are reset.
- Rate-limit login and recovery endpoints.
- Do not reveal whether an email/phone exists during public password recovery.
- Enforce RBAC and record-level checks in backend services.
- Test for privilege escalation and insecure direct object references.
- Review access assignments periodically.

## 4. Sensitive information controls

- Collect only information needed for care, administration or a confirmed legal requirement.
- Mask identity numbers in ordinary views.
- Restrict medical records to approved medical/care roles.
- Restrict rescue locations and family tracing records.
- Do not place sensitive information in URLs, browser analytics or error logs.
- Do not include full resident details in push/SMS/email notifications by default.
- Give family members access only to explicitly shared information for their linked resident.
- Do not assume a relative is legally authorized merely because they claim a relationship; define an appropriate verification process.

## 5. Document and file security

- Store files in private object storage.
- Validate file size, file signature and allowed formats.
- Do not trust filename extensions or client-provided MIME types.
- Scan uploads for malware where supported.
- Store a checksum for integrity verification.
- Use short-lived, scoped signed URLs for transfers.
- Never expose permanent object-storage credentials or public buckets.
- Prevent executable content from being rendered inline.
- Log sensitive document views and downloads.
- Define retention and deletion policies.
- Encrypt data in transit and at rest.
- Keep backups encrypted and access-restricted.

## 6. AI and OCR safety

- Treat extracted content as unverified suggestions.
- Show source document and page evidence beside extracted fields.
- Require human review before writing to verified records.
- Require authorized medical review for clinical data.
- Never allow AI to diagnose, prescribe or change medication instructions.
- Never allow AI to autonomously submit official forms.
- Keep extraction provider/model metadata and review history.
- Minimize or redact data sent to external AI services.
- Review provider retention, training, data region and contractual terms.
- Do not use organization documents to train models unless separately authorized and contractually appropriate.
- Treat document text as untrusted input; defend against prompt injection embedded in uploaded documents.
- AI tools must not receive broader data access than the user initiating the task.

## 7. Location privacy

- Capture GPS only after a user action and browser/device permission.
- Explain why location is requested.
- Store capture source, time and accuracy where available.
- Allow manual address entry when GPS is unavailable.
- Do not continuously track residents, staff or visitors.
- Do not publish exact rescue locations by default.
- Limit map and coordinate access to authorized roles.

## 8. Audit logging

Record:
- Login successes and failures.
- Account and permission changes.
- Sensitive record views.
- Create/update/archive actions.
- Approval/rejection decisions.
- Document uploads and downloads.
- Exports and generated reports.
- AI extraction approvals and corrections.
- Form publication and version changes.
- Backup and restore actions.

Audit records must not contain passwords, access tokens, full identity numbers, full medical notes or file contents. Restrict audit access and protect logs from ordinary modification.

## 9. Application and infrastructure security

- Use HTTPS everywhere.
- Store secrets in a secret manager or protected environment configuration.
- Keep dependencies patched and scan for vulnerabilities.
- Apply secure CORS, CSRF protection where applicable, content security policy and security headers.
- Validate and normalize all input.
- Use parameterized database operations through the ORM.
- Rate-limit public endpoints.
- Separate development, test, staging and production environments.
- Restrict database network access.
- Use least-privilege service accounts.
- Monitor suspicious access patterns.
- Maintain a vulnerability and incident response process.

## 10. Backups and recovery

- Back up database and uploaded files.
- Encrypt backup artifacts.
- Store backups separately from production credentials and infrastructure.
- Monitor backup success/failure.
- Define recovery point objective (RPO) and recovery time objective (RTO) with the organization.
- Perform scheduled restore drills.
- Verify that restored database references still resolve to the correct documents.
- Record and review restoration outcomes.

## 11. Privacy operations

The organization should define:
- Privacy notice and collection purposes.
- Consent or other applicable lawful basis.
- Guardian/family authorization process.
- Data access and correction process.
- Data retention schedule.
- Secure archival and deletion process.
- Breach response and notification process.
- Vendor and processor review.
- Procedures for public rescue requests and sensitive referrals.

## 12. Security acceptance tests

- A user cannot access another organization's records by changing an ID.
- A staff member without medical permission cannot view medical notes or download medical files.
- A family account can see only the linked resident data explicitly shared with it.
- A suspended user cannot reuse an old session.
- A document download link expires and cannot be used outside its scope.
- Upload validation rejects disallowed or suspicious files.
- AI extraction cannot overwrite verified fields without approval.
- Medicine schedules cannot be activated from unverified OCR output.
- Sensitive data is absent from ordinary application logs.
- Backup restoration recovers records and associated files.
