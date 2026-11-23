# ElderCare OS — Open Architectural Decisions (SaaS Evolution)

**Date:** 23 November 2026  
**Document Status:** Architecture Review & Decision Matrix  
**Scope:** Evolution from Single-NGO Frontend to Commercial Multi-Tenant SaaS  

---

## 1. SaaS Architectural Decisions Matrix

| # | Decision Topic | Why It Matters | Options Considered | Recommended Default (Assumption) | What Is Blocked Until Confirmed |
|---|---|---|---|---|---|
| 1 | **Database Multi-Tenancy Architecture** | Governs operational complexity, hardware costs, data isolation compliance, and backup mechanics. | **A.** Database-per-tenant<br>**B.** Schema-per-tenant<br>**C.** Shared DB + Shared Schema with PostgreSQL Row-Level Security (RLS) | **Option C (Shared DB with RLS).** Simplest operational model, lowest hosting cost for 50–500 NGOs, with cryptographic and engine-enforced isolation via `SET LOCAL app.current_org`. | Advanced multi-region tenant sharding. Local development can proceed immediately with Option C. |
| 2 | **Tenant Workspace Resolution & Routing** | Dictates user URL experience, SSL wildcard certificates, and local development testing ergonomics. | **A.** Subdomain: `https://[slug].eldercareos.com`<br>**B.** Path-based: `https://eldercareos.com/org/[slug]/...`<br>**C.** Session / Header context only | **Option A with Local Fallback.** In production, use subdomain routing (`sriseva.eldercareos.com`). In local development, fall back to session/cookie tenant selector to avoid local DNS editing. | Production DNS configuration. Next.js App Router route structure can proceed immediately. |
| 3 | **User Identity & Multi-Organization Access** | Determines whether a doctor or auditor can log in once and access multiple old age homes, or needs separate logins per home. | **A.** Siloed per-tenant accounts (same email has separate password per NGO)<br>**B.** Global user identity with `organization_memberships` join table | **Option B (Global Identity with Memberships).** Allows doctors, trustees, and platform staff to switch between authorized NGO workspaces seamlessly without logging out. | Auth user schema finalization. Implementation of Option B is backward-compatible with single-tenant logins. |
| 4 | **Commercial Billing Gateway for India** | Dictates currency processing, GST compliance, e-invoicing, recurring mandates, and payment success rates. | **A.** Razorpay Subscriptions<br>**B.** Stripe India<br>**C.** Cashfree / Offline Cheque Invoicing | **Option A (Razorpay Subscriptions + Manual Invoicing).** Razorpay natively supports Indian UPI recurring mandates, cards, and auto-generates GST-compliant tax invoices. Support manual bank transfer entry for grant-funded NGOs. | Production payment webhooks. Mock subscription billing service can be used for Phase 2. |
| 5 | **Subscription Non-Payment & Grace Period Policy** | In an old-age home, turning off software immediately due to a failed payment could compromise resident medical care and food scheduling. | **A.** Immediate lock-out upon expiry<br>**B.** 14-day Grace Period with warning banner, followed by **Read-Only Mode** (no new entries, but all medical data visible)<br>**C.** Never block, charge penalty fee | **Option B (Grace Period $\rightarrow$ Read-Only Healthcare Safety Mode).** Caregivers and doctors can always view medication and emergency contacts even if the NGO administrator has an overdue subscription bill. | Subscription middleware enforcement logic. |
| 6 | **Platform Owner Portal Architecture** | Determines whether platform administration (managing NGO tenants, plans, global health) lives inside the same codebase. | **A.** Dedicated separate Next.js app in a monorepo<br>**B.** Protected route group within the existing Next.js app (`/platform-admin/...`) with dedicated Platform Super Admin guards | **Option B (Protected Route Group).** Reuses existing UI primitives (`button`, `card`, `modal`), Tailwind configuration, and server layout without the overhead of monorepo tooling. | None. Can be added additively alongside existing routes. |
| 7 | **File Storage Multi-Tenancy Structure** | File storage must guarantee that medical records, scanned identity cards, and receipts are isolated per NGO in S3. | **A.** Single bucket with tenant folder prefix: `s3://eldercare-vault/tenants/{org_id}/...`<br>**B.** Separate S3 bucket per NGO | **Option A (Single Bucket with Tenant Prefix).** S3 bucket policies and backend presigned URL generation enforce `{org_id}` path ownership, minimizing cloud infrastructure overhead. | Cloud infrastructure provisioning. Local storage mock uses same folder path hierarchy. |

---

## 2. Recommendation to Proceed

All recommended defaults in this document are **additive, non-destructive, and strictly backward-compatible** with the existing codebase:
- Existing UI screens and routes continue functioning without regression.
- Local mock fixtures map 1:1 to the default primary tenant (`Sri Seva Old Age Home`).
- The system is architecturally ready for commercial multi-tenant onboarding.
