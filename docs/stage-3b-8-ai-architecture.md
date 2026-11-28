# Stage 3B-8 AI & Document Intelligence Architecture

## Modular Pipeline (`src/lib/document-intelligence/`)
- `types.ts`: Shared contracts (`DocumentCategory`, `ProcessingStatus`, `FormType`, `AI_SAFETY_NOTICE`).
- `schemas.ts`: Category field schemas + 7 operational form definitions (`FORM_DEFINITIONS`).
- `providers/ocr-provider.ts`: Provider-independent OCR adapter (pure-Node PDF stream extractor, optional local Tesseract CLI, optional `OCR_PROVIDER_ENDPOINT`).
- `document-classifier.ts`: Multi-language (English + Hindi) rule/evidence classifier with confidence scoring and alternative categories.
- `field-extractor.ts`: Source-grounded structured extraction (`null` when absent, source snippet + page tracking, Aadhaar masking).
- `validation-engine.ts`: Prompt-injection detection and manual-review enforcement.
- `review-service.ts`: Human edit tracking, field verification, clinical approval gates, and revision history.
- `form-generator.ts`: Draft form mapping, validation, and operational submission (`residents`, `rescue_cases`, `generated_form_drafts`).
- `processing-pipeline.ts`: Idempotent job queueing, monthly subscription quotas, and `FOR UPDATE SKIP LOCKED` worker execution.
