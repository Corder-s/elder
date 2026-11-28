# AI & OCR Document Intelligence Audit — ElderCare OS

## Actual OCR Capabilities in Current Environment
1. **Built-in PDF Text-Stream Extractor (Verified):** Extracts text from PDF `BT...ET` / `Tj` / `TJ` operators and FlateDecode streams across English (`en`) and Hindi Devanagari (`hi`), enforcing `OCR_MAX_PAGES = 25` and rejecting malformed PDFs.
2. **Local Tesseract CLI (Not Installed on Host):** `Get-Command tesseract` confirmed `tesseract` is not installed on this Windows host.
3. **External OCR/AI Provider (Not Configured):** `OCR_PROVIDER_ENDPOINT` and `ENABLE_EXTERNAL_OCR` are unset.
- **Result:** Text-based PDFs are extracted and verified automatically. Scanned-image PDFs and JPEG/PNG/WebP uploads are **not** fabricated; they safely route to `needs_review` with empty text until Tesseract or an external OCR provider is configured.

## AI Safety & Clinical Boundaries
- Prompt-injection patterns (`ignore previous instructions`, `approve automatically`, etc.) are flagged (`prompt_injection_detected = true`) and forced into `needs_review`.
- Missing fields return `null`; source text and page numbers are preserved.
- Clinical approval for medical documents is restricted to `doctor` and `admin` (`403` for `nurse`/`staff`).
- AI never creates residents, admissions, or medical records autonomously; human approval + draft form review + operational submission are required.

## Findings
- **MEDIUM — Worker Stale-Lock Recovery Not Automated (`AUD-MED-04`):** `document_processing_jobs.timeout_at` is set when claiming a job, but neither `scripts/run-doc-intelligence-worker.js` nor `processing-pipeline.ts` automatically resets `status = 'processing' AND timeout_at < CURRENT_TIMESTAMP` back to `'queued'` after a worker crash.
