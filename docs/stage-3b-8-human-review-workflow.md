# Stage 3B-8 Human Review Workflow

## Job States
`queued` -> `processing` -> `extracted` | `needs_review` -> `approved` | `rejected` (or `failed` after `max_attempts`).

## Reviewer Capabilities (`src/lib/document-intelligence/review-service.ts`, `src/app/documents/intelligence/page.tsx`)
- Side-by-side comparison of raw OCR source text and structured extracted fields.
- Field-level editing (`origin: 'manual'`, `verified: true`) and verification checkboxes.
- Full revision history stored in `document_review_records` with `reviewer_id`, `previous_fields`, `edited_fields`, and `created_at`.
- **Clinical Boundary:** Medical categories (`medical_prescription`, `medical_report`, `discharge_summary`) can only be approved by `doctor` or `admin` (`403` for `nurse`/`staff`).
