# Stage 3B-6 Subscription Lifecycle

## Supported States
`trial` | `pending_payment` | `active` | `grace_period` | `past_due` | `suspended` | `cancelled` | `expired`

## Key Transitions
1. **Trial -> Active**: Valid Razorpay checkout verification or `payment.captured` webhook settles the open invoice, sets `status = 'active'`, updates `current_period_start`, `current_period_end`, and `next_renewal_at`, and clears grace/suspension timestamps.
2. **Active / Pending -> Grace Period**: Triggered on `payment.failed` webhook or Platform Owner `enter_grace_period`; sets `grace_period_ends_at` (7 days default).
3. **Grace Period -> Past Due -> Suspended**: Triggered by delinquency progression or Platform Owner `suspend`; sets `suspended_at` and activates Healthcare Safety Mode.
4. **Active -> Cancelled**: Triggered by NGO Admin (`POST /api/billing/subscription` with `action: 'cancel'`) or Platform Owner; records `cancelled_at` and `cancellation_reason`.
5. **Suspended / Cancelled / Expired -> Active (Reactivation)**: Triggered via successful payment verification or Platform Owner `reactivate`; sets `reactivated_at` and restores `organizations.status = 'active'`.
6. **Upgrades & Downgrades**: Upgrades execute via checkout + payment settlement; downgrades validate that current active residents, staff, and branches do not exceed the target plan limits (`409 Conflict` if exceeded).

## Audit & Notifications
Every transition writes an entry to `tenant_audit_logs` (and `platform_audit_logs` for Platform Owner actions) and records a non-clinical notification in `billing_notifications`.
