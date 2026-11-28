# Stage 3B-8 Pre-Flight Audit

## Baseline Inspected
- **Stage 3B-7 Document Vault (`src/lib/storage/*`, `src/app/api/documents/*`):**
  - Private S3-compatible object storage, presigned upload/download URLs, magic-byte validation, SHA-256 checksums, malware scan adapter, quota reservation, and retention cleanup are implemented and verified.
  - No OCR engine, document classification, structured field extraction, human review workflow, or digital form generation existed prior to Stage 3B-8.
- **Operational Schemas (`residents`, `admissions`, `rescue_cases`, `medical_records`):**
  - Existing APIs (`POST /api/residents`, `POST /api/rescue-cases`, `GET /api/admissions`) enforce RLS, branch isolation, and subscription quotas. Stage 3B-8 form submission integrates directly with these tables inside `withTenantContext` rather than creating duplicate resident/admission tables.
- **Worker Infrastructure (`scripts/run-export-worker.js`):**
  - PostgreSQL-backed `FOR UPDATE SKIP LOCKED` worker pattern exists without Redis or Docker. Stage 3B-8 follows the same architecture with `scripts/run-doc-intelligence-worker.js`.
- **Local OCR Environment:**
  - `tesseract` CLI is not pre-installed on the host OS. Therefore, Stage 3B-8 implements a provider-independent OCR adapter supporting:
    1. Built-in pure-Node PDF text-stream & Unicode (English + Hindi Devanagari) extractor.
    2. Optional local `tesseract` CLI adapter (`TESSERACT_PATH` / `tesseract` when installed).
    3. Optional external OCR/AI provider endpoint (`OCR_PROVIDER_ENDPOINT`) with server-side credentials.
