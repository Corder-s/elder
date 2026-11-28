# ElderCare OS — Android Compatibility & Architecture Audit

**Document ID:** ECO-DOC-ANDROID-AUDIT-001  
**Audit Date:** November 27, 2026  
**Auditor:** Senior Android Build Engineer & Next.js Architect  
**Target Project:** `c:\Users\Shubham Saini\Desktop\ngo new version` (`eldercare-os` v1.0.0)  

---

## 1. Current Application Architecture

ElderCare OS is a full-stack multi-tenant SaaS application built on:
- **Framework:** Next.js `15.1.7` (App Router), React `19.0.0`, TypeScript `5.7.3`, Tailwind CSS `3.4.17`.
- **Routes:** 60 compiled routes (pages + 24 REST API endpoints under `src/app/api/**`).
- **Middleware:** [`src/middleware.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/middleware.ts) enforces Edge JWT verification (`jose`) on workspace, `/platform/*`, and `/api/*` routes.
- **Database:** PostgreSQL 18.6 via `pg` with transaction-local Row-Level Security (`withTenantContext()` in [`src/lib/db.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/lib/db.ts)).
- **Authentication & Security:** Persistent `user_sessions` table, `HttpOnly` `eldercare_session` cookie (plus Bearer token support), `bcryptjs`, TOTP MFA (`src/lib/mfa.ts`), and SMTP email dispatch (`nodemailer`).
- **UI Shell:** Mobile-first container ([`src/components/layout/AppShell.tsx`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/components/layout/AppShell.tsx)) with `MobileHeader`, `MobileDrawer`, `MobileBottomNav`, and `QuickActionSheet`, plus PWA manifest ([`src/app/manifest.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/src/app/manifest.ts)).

---

## 2. Why Static Export (`output: 'export'`) Is Not Viable

Static HTML export cannot be used for ElderCare OS because the application depends on:
1. **24 Server-Side API Routes (`src/app/api/**`):** PostgreSQL queries (`pg`), `bcryptjs` password hashing, `nodemailer` SMTP, `crypto` TOTP encryption, and RLS tenant isolation.
2. **Edge Middleware (`src/middleware.ts`):** Route protection and header injection (`x-user-id`, `x-organization-id`, `x-role`) are unsupported in static exports.
3. **Server-Side Session Cookies:** `HttpOnly`, `SameSite=Lax` cookies and server-side session revocation (`verifyServerSession()`).

Forcing `output: 'export'` would strip the backend API and authentication layers.

---

## 3. Selected Android Architecture: Capacitor Hybrid Container

**Selected Approach:** **Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)** wrapping the live Next.js full-stack application.

### Architecture Design
- **Native Shell:** Capacitor Android project (`android/`) with Application ID `com.eldercareos.app` and App Name `ElderCare OS`.
- **Production Mode:** `capacitor.config.ts` loads the remote HTTPS SaaS origin configured via `CAPACITOR_SERVER_URL` (defaulting to `https://app.eldercareos.com` for production builds—never hardcoded to a dev server or `localhost` as a production default).
- **USB Device Verification Mode (Without External Deployment):** Because external deployment is restricted in this phase, physical-device verification over USB uses the **compiled production Next.js server (`pnpm start`)** tunneled over USB via `adb reverse tcp:3000 tcp:3000` with `CAPACITOR_SERVER_URL=http://localhost:3000` during debug APK verification.
- **Zero Secret Leakage:** No `.env`, `DATABASE_URL`, `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, or SMTP credentials are bundled inside `android/app/src/main/assets`.

---

## 4. Android Environment Audit

| Tool / Component | Detected Version / Path | Status | Notes |
|---|---|---|---|
| **Java JDK** | OpenJDK `25.0.4+7` (Temurin) | Installed | Will verify Gradle/AGP compatibility during Phase 8 |
| **Node.js / pnpm** | `v24.19.0` / `pnpm 12.14.0` | Installed | Ready |
| **Android SDK (`ANDROID_HOME`)** | `C:\dev\android-sdk` | Installed | Platforms `android-34`, `35`, `36`, `36.1`; Build Tools `35.0.0`, `36.0.0` |
| **ADB** | `C:\dev\android-sdk\platform-tools\adb.exe` & WinGet | Installed | Physical device `W4MVAITW7H59DMDY` connected & authorized |
| **Capacitor Packages** | Not yet installed | Missing | Need `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` |

---

## 5. Mobile Compatibility & Security Review

- **Mobile Layout:** `AppShell.tsx` renders a `max-w-md` mobile frame with fixed bottom nav (`MobileBottomNav.tsx`) and slide-out `MobileDrawer.tsx`. Viewport (`device-width`, `initialScale: 1`) is already configured in `src/app/layout.tsx`.
- **Potential Android WebView Considerations:**
  1. **Safe-Area / Status Bar:** `AppShell` and `MobileBottomNav` should respect Android WebView viewport height and not overlap content.
  2. **Back Button Handling:** Capacitor WebView history navigation (`canGoBack`) should navigate back through Next.js routes rather than exiting immediately on the first back press.
  3. **Cookie & Session Persistence:** `SameSite=Lax` + `HttpOnly` cookies persist in Android WebView `CookieManager` across app restarts when served from a consistent origin.
  4. **SSL / HTTPS:** Production builds must use `https://` without bypassing certificate validation.
