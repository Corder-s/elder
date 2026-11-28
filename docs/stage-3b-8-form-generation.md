# Stage 3B-8 Digital Form Generation

## 7 Operational Forms (`src/lib/document-intelligence/schemas.ts`, `form-generator.ts`, `src/app/forms/page.tsx`)
1. `resident_admission`: New Resident Admission Form (creates `residents` record with `enforceResidentQuotaTx`).
2. `resident_profile`: Resident Profile Form.
3. `guardian_family`: Guardian & Family Details Form.
4. `emergency_contact`: Emergency Contact Form.
5. `rescue_registration`: Rescue Case Registration Form (creates `rescue_cases` record).
6. `document_verification`: Document Verification Checklist.
7. `medical_summary_review`: Medical Document Summary for Clinician Review (submission restricted to `doctor`/`admin`).

## Lifecycle
Only `approved` extraction jobs can generate a `generated_form_drafts` record (`409` otherwise). Drafts support editing, validation, review sign-off, and single-use operational submission (`409` on duplicate submission).
