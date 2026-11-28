# Stage 3B-8 OCR Engine

## Supported Formats & Languages
- **Formats:** Text/compressed PDFs, scanned PDFs, JPEG, PNG, WebP.
- **Languages:** English (`en`) and Hindi Devanagari (`hi` / `\u0900-\u097F`), with extensible adapter hooks for additional Indian languages.

## Provider Adapters (`src/lib/document-intelligence/providers/ocr-provider.ts`, `scripts/run-doc-intelligence-worker.js`)
1. **Built-in PDF Extractor:** Validates `%PDF-` header and object structure, enforces `OCR_MAX_PAGES` (25 pages default), decompresses FlateDecode streams via `zlib`, extracts `BT...ET` text operators per page, and detects table/language metadata without native dependencies.
2. **Local Tesseract CLI Adapter:** Invokes `tesseract` (`-l eng+hin`) if installed on the host OS (`TESSERACT_PATH`).
3. **External OCR Endpoint:** Optional `OCR_PROVIDER_ENDPOINT` when `ENABLE_EXTERNAL_OCR=true` (server-side credentials only).
- **Safety:** Unreadable/image-only scans without Tesseract or external OCR are never fabricated; they are flagged `needs_review` with empty text. Original files in S3 are never overwritten.
