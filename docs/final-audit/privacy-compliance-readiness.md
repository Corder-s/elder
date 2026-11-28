# Privacy & Compliance Readiness — ElderCare OS

## Technical Controls Present
- **Data Minimization & Exclusion:** Platform Owner APIs exclude clinical/medical/document content; tenant exports exclude `password_hash`, `mfa_secret`, `mfa_recovery_codes`, JWTs, and gateway secrets; Aadhaar numbers extracted by AI are masked (`XXXX...1234`).
- **Audit Trails:** Immutable `tenant_audit_logs` and `platform_audit_logs` record auth, RBAC, billing, document access, export, and AI review events without logging file contents or passwords.
- **Consent & Safety:** Consent form classification supported; `AI_SAFETY_NOTICE` displayed in API and UI; Healthcare Safety Mode preserves clinical access during billing delinquency.

## Legal & Regulatory Review Required Before Production Launch
- **External AI Data Processing Agreements (DPAs):** If `OCR_PROVIDER_ENDPOINT` or external AI extraction is enabled in production, DPAs and Indian DPDP Act / healthcare data residency reviews are required before sending resident PII/medical documents to third-party APIs.
- **Data Retention Schedules:** Legal sign-off is needed on retention periods for medical records, financial receipts, and archived documents.
- **Privacy Policy & Consent Notices:** Qualified legal counsel must review NGO-facing and resident/guardian-facing privacy notices and consent forms.
