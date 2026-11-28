# Stage 3B-6 Entitlement Matrix & Healthcare Safety Mode

## Healthcare Safety Mode Policy
| Capability | `trial` / `active` | `grace_period` / `past_due` | `suspended` / `cancelled` / `expired` |
|---|---:|---:|---:|
| Clinical Read & Resident Profiles | Allowed | Allowed | **Allowed** |
| Medication Schedules & Administration | Allowed | Allowed | **Allowed** |
| Daily Care & Diary Logs | Allowed | Allowed | **Allowed** |
| Data Export | Allowed | Allowed | **Allowed** |
| New Resident Admissions | Quota Checked | Quota Checked | **Blocked (403)** |
| New Staff Invites / Reactivations | Quota Checked | Quota Checked | **Blocked (403)** |
| New Branches | Quota Checked | Quota Checked | **Blocked (403)** |
| New Document Uploads | Quota Checked | Quota Checked | **Blocked (403)** |
| Premium Features (`advanced_reports`, etc.) | Plan Flag Checked | Plan Flag Checked | **Blocked** |

## Plan Quotas (Initial Seeded Tiers)
| Plan | Monthly Price | Residents | Staff | Branches | Storage |
|---|---:|---:|---:|---:|---:|
| Starter | ₹2,999 | 30 | 5 | 1 | 5,120 MB |
| Professional | ₹7,999 | 150 | 25 | 5 | 51,200 MB |
| Enterprise | ₹19,999 | 1,000 | 200 | 50 | 512,000 MB |

## RBAC Enforcement
- `org:subscription:read`: Required for viewing subscription, invoices, and usage.
- `org:subscription:manage`: Required for initiating checkout, verifying payments, downgrades, cancellations, and reactivations.
- Platform Owner MFA (`requirePlatformOwner`): Required for all `/api/platform/*` billing endpoints; clinical medical records are strictly excluded.
