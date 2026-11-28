# Stage 3B-8 AI Safety, Privacy & Prompt Injection Defense

## Healthcare Boundaries
- ElderCare OS Document Intelligence is strictly an administrative extraction assistant — it never diagnoses, prescribes, recommends treatment, or creates official medical/resident records autonomously.
- Prominent notice displayed in API responses and UI: `"AI-extracted information may contain errors. Verify all information against the original document before saving it to an official resident record."`

## Security Controls
- **Untrusted Input & Prompt Injection Defense:** `validation-engine.ts` scans extracted text for instruction-override patterns (`ignore previous instructions`, `approve automatically`, `bypass review`, etc.), sets `prompt_injection_detected = true`, and forces `needs_review`.
- **RBAC & Isolation:** `FORCE ROW LEVEL SECURITY` on all 4 Stage 3B-8 tables; Family members and Platform Owners are blocked (`403`) from internal extraction and form endpoints; no document contents are logged in ordinary application logs.
- **Cost & Quota Controls:** Per-plan monthly processing quotas (`starter`: 50, `professional`: 500, `enterprise`: 5000), 25-page max limit, idempotent job queueing, and 60s worker timeouts.
