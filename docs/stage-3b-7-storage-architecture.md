# Stage 3B-7 Storage Architecture

## Private S3-Compatible Object Storage (`src/lib/storage/s3-client.ts`)
- Built on `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- Configured via server-side environment variables: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (`forcePathStyle: true` when `S3_ENDPOINT` is set).
- Credentials are never exposed to browser clients and buckets remain strictly private.
- All object keys are generated server-side in the format `tenants/{organizationId}/documents/{documentUuid}` (and `tenants/{organizationId}/exports/{jobId}.{zip|json}`).
- Internal `s3_key` values are stripped by `sanitizeDocumentRecord()` before returning API responses.
