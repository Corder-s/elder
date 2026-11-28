# Stage 3B-8 Extraction Schemas

## Categories (`src/lib/document-intelligence/schemas.ts`)
- `aadhaar_identity`, `other_identity`, `address_proof` (masks ID numbers as `XXXX...1234`)
- `medical_prescription`, `medical_report`, `discharge_summary` (source-quoted observations & medications only)
- `admission_application`, `consent_form`, `rescue_case_report`, `guardian_info`, `financial_document`, `other`

## Extraction Rules
- Missing values strictly return `null` (never inferred or fabricated).
- Every extracted field stores `sourceText`, `pageNumber`, `confidence`, `origin` (`extracted` vs `manual`), and `verified` (`boolean`).
