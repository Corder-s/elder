# Performance Audit — ElderCare OS

## Observed Measurements
- **Production Build (`pnpm build`):** 100/100 routes compiled cleanly; shared First Load JS is `105 kB`, with page bundles ranging from `106 kB` to `134 kB`.
- **Indexed Queries:** Migrations `010`, `011`, `012`, and `013` provide composite indexes on `(organization_id, ...)` for operational, billing, document, export, and AI job tables.
- **Bounded Worker Processing:** Export and OCR workers claim 1 job per org per cycle using `FOR UPDATE SKIP LOCKED`, enforcing `OCR_MAX_PAGES = 25` and `DOCUMENT_MAX_SIZE_BYTES = 10 MB`.

## Findings
- **MEDIUM — Unbounded List Queries (`AUD-MED-03`):** 8 operational `GET` routes (`residents`, `admissions`, `attendance`, `staff`, `visitors`, `medical/records`, `finance/donations`, `finance/expenses`) omit `LIMIT`/`OFFSET` pagination.
- **LOW — `<img>` Preview Element (`AUD-LOW-02`):** `src/app/documents/page.tsx` uses a standard `<img>` tag for presigned S3 image preview (intentional for dynamic presigned URLs).
