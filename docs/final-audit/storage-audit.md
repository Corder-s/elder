# Storage & Data Portability Audit — ElderCare OS

## Verified Controls
- **Private Object Storage:** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (`src/lib/storage/s3-client.ts`) with server-generated object keys (`tenants/{orgId}/documents/{uuid}`), stripping `s3_key` from API responses.
- **Upload Lifecycle:** `upload-intents` reserves storage quota (`reserved_bytes`, 5m expiry); `complete-upload` checks `HeadObject`, actual size, magic-byte signatures (`%PDF-`, JPEG, PNG, WebP), SHA-256 checksum, and reconciles `usage_records`.
- **Download Authorization:** `download-url` validates org, branch, family resident links, confidentiality, and `available` status before issuing 180s presigned `GET` URLs.
- **Tenant Exports:** `scripts/run-export-worker.js` packages JSON + CSV + authorized documents into SHA-256-verified ZIPs (72h expiry), excluding `password_hash`, `mfa_secret`, JWTs, and platform secrets.

## Findings
- **HIGH — Production Malware Scanner & Live S3 Bucket Not Configured (`AUD-HIGH-01`):** `MALWARE_SCANNER_ENDPOINT`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` are blank in `.env`. Without `MALWARE_SCANNER_ENDPOINT`, production uploads remain quarantined in `pending_scan`. Automated tests verified storage using an in-process S3-compatible mock server and `ALLOW_DEV_SCAN_BYPASS=true`.
