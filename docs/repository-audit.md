# ElderCare OS — Repository Audit & Technical Baseline

**Document Version:** 2.0.0  
**Audit Date:** 23 November 2026  
**Auditor:** Senior Software Architect & Full-Stack Engineering Lead  
**Working Directory:** `c:\Users\Shubham Saini\Desktop\ngo new version`  
**Git Branch:** `master` (Uncommitted frontend additions present, clean working tree ready for staging)

---

## 1. Executive Summary

ElderCare OS has successfully transitioned from its initial system design specification phase (Phase 0) into an operational **Frontend-First Application (Phase 1)**. 

The application currently features a complete, responsive mobile-first SaaS interface built on **Next.js 15 (App Router)** and **React 19**, incorporating a strict purple-and-white healthcare design system (`#6D28D9`, `#4C1D95`, `#FAF8FF`). All core screens, role-based dashboards, and domain navigation flows are fully functional against client-side typed service fixtures.

Backend API routes and persistent database tables have not yet been instantiated. The physical PostgreSQL 18 instance is active on the operating system, with logical relational schemas and REST endpoint specifications documented in detail.

---

## 2. Technology Stack Inventory

### 2.1 Frontend Architecture
* **Framework:** Next.js `15.1.7` (App Router architecture, React Server Components enabled)
* **UI Runtime:** React `19.0.0` & React-DOM `19.0.0`
* **Language:** TypeScript `5.7.3` (Strict type-checking verified via `next build`)
* **Styling & Design System:**
  * Tailwind CSS `3.4.17` with Autoprefixer `10.4.20` and PostCSS `8.5.2`
  * Strict Purple Palette:
    * Primary Purple: `#6D28D9`
    * Deep Purple: `#4C1D95`
    * Light Purple / Lavender Accents: `#F3E8FF`
    * Surface Background: `#FAF8FF`
    * Cards & Panels: `#FFFFFF`
    * Primary Text: `#17133A` | Secondary Text: `#686581`
    * Status Badges: `#16A34A` (Success), `#F59E0B` (Warning), `#E11D48` (Danger), `#0EA5E9` (Info)
* **Iconography:** Lucide React `0.475.0`
* **Utility Libraries:** `clsx` (`^2.1.1`), `tailwind-merge` (`^2.6.0`), `class-variance-authority` (`^0.7.1`), `date-fns` (`^4.1.0`)
* **PWA & Mobile Metadata:** `src/app/manifest.ts` configured for standalone mobile execution, viewport meta tuned for touch ergonomics without zoom jitter.

### 2.2 Backend & Data Layer Status
* **API Implementation:** `MISSING` (Executable backend endpoints in `src/app/api/` or dedicated microservice do not yet exist).
* **API Contract Baseline:** `api-specification.md` documents REST v1.0 standard envelope responses (`data`, `error`, `pagination`) for 14 operational modules.
* **Client Service Layer:** `src/services/mockDataService.ts` implements simulated asynchronous API latency (80–200ms) delivering typed fixtures conforming strictly to domain contracts.
* **Database Engine:** PostgreSQL 18 (x64) installed and running locally as Windows Service `postgresql-x64-18`.
* **Database Schema Status:** `MISSING` in engine (No tables, DDL migrations, or ORM clients generated yet). Complete relational design (30+ tables) specified in `database-schema.md`.
* **ORM:** None currently installed (Prisma or Drizzle recommended for Next.js/PostgreSQL integration).
* **Object Storage:** `MISSING` in implementation; Amazon S3 / MinIO presigned URL flow specified in `architecture.md`.
* **Background Workers & Queues:** `MISSING` in code; Redis + BullMQ specified in `architecture.md` for OCR and report generation.

### 2.3 Tooling & Infrastructure
* **Package Manager:** `pnpm` (v12.14.0) with `.npmrc` build approvals configured.
* **Linting & Code Quality:** ESLint `8.57.1` with `eslint-config-next` `15.1.7` (`pnpm lint` passing with 0 errors).
* **Build Status:** `pnpm build` passes with exit code `0` (30/30 static routes prerendered).
* **Environment Configuration:** No active `.env` file present; configuration currently relies on client-side defaults.
* **Docker / Deployment:** Not present (conforming strictly to constraints).

---

## 3. Verified Application Routes & Pages

The application provides 25 fully verified, styled, and navigable routes:

| Route Path | Module / Purpose | Layout / Key Capabilities |
| :--- | :--- | :--- |
| `/` | **Main Dashboard** | Dynamic role-based dashboard rendering based on active session context; interactive role selector carousel. |
| `/welcome` | **Splash / Welcome** | Hero elderly couple image, value propositions, carousel dots, "Get Started" and "I have an account" actions. |
| `/login` | **Authentication** | Email/password inputs, visibility toggle, role simulation switcher, Google/Microsoft SSO triggers, forgot password link. |
| `/register` | **Registration** | Account creation form capturing name, organization, email, and credentials. Redirects to email verification. |
| `/email-verification` | **Verification** | 6-digit confirmation code input with auto-focus progression and resend countdown. |
| `/role-selection` | **Role Request** | Dedicated 8-role card selector with responsibilities preview; enforces non-privileged initial submission. |
| `/pending-approval` | **Access Hold** | Status tracker for pending accounts awaiting administrator approval. |
| `/forgot-password` | **Recovery** | Email input dispatching secure password recovery instructions. |
| `/reset-password` | **Credential Reset** | Verification token validator and new password entry form. |
| `/unauthorized` | **Access Guard** | Error boundary screen explaining role-based permissions and escalation paths. |
| `/residents` | **Resident Directory** | Resident cards, search, status filters, and comprehensive Resident Profile tabbed view (Overview, Medical, Attendance, Docs). |
| `/rescue-cases` | **Rescue Management** | Rescue case cards (RC-101, RC-102), timeline milestones, triage status tags, and new case registration modal. |
| `/admissions` | **Admissions & Intake** | Application intake queue, verification pipeline, room and bed allocation modal. |
| `/medical-records` | **Clinical Records** | Patient overview, medical history conditions list, active prescriptions, and vital observation trends. |
| `/medicines` | **Medication Schedule**| Morning/Afternoon/Night dose checklists with interactive intake confirmations. |
| `/attendance` | **Daily Roll Call** | Headcount stats (Present, Hospitalized, On Leave), 1-tap presence toggle per resident. |
| `/visitors` | **Visitor Pass & Logs** | Active premise headcount, gate pass issuance modal, check-in and check-out time tracking. |
| `/staff` | **Staff & Volunteers** | Team directory with role badges, on-duty status indicators, and contact triggers. |
| `/facilities` | **Rooms & Facilities** | Building occupancy bar, room inventory, vacant bed tracking, and maintenance status. |
| `/events` | **Calendar & Activities**| Monthly calendar date grid, scheduled community events, and activity participation cards. |
| `/diary` | **Daily Shift Diary** | Shift handover notes (morning/evening/night), elder mood tracking, and incident logging. |
| `/documents` | **Document Vault** | Encrypted storage listing, category tags, OCR processing badges, and secure download actions. |
| `/finance` | **Donations & Accounts**| 80G tax receipt badges, donation contribution logger, income vs. expense breakdown. |
| `/tasks` | **Tasks & Reminders** | Daily completion progress bar, priority tags (Urgent, High, Medium, Low), task checklist. |
| `/reports` | **Reports & Analytics** | 9 report categories (Residents, Medical, Rescue, Financial, Compliance) with PDF/Excel export modal. |
| `/settings` | **System Preferences** | Organization credentials, notification toggles, SMS alerts, and offline-first cache settings. |

---

## 4. Role-Based Dashboards Inventory

Eight discrete dashboards are fully implemented in `src/components/dashboards/`:

1. **Super Admin Dashboard (`SuperAdminDashboard.tsx`)**:
   - Multi-branch metrics (3 branches, 48 users, 286 residents, 12 active rescue cases).
   - Resident status distribution donut chart.
   - Administrative quick actions (Manage Branches, Manage Users, System Settings, Audit Logs).
2. **Administrator Dashboard (`AdministratorDashboard.tsx`)**:
   - 6 Pastel Stat Cards matching reference specifications (86 Residents, 82 Admitted, 5 Rescue Cases, 6 Medical Appointments, 14 Visitors, ₹1,85,000 Donations).
   - Quick Action 2×3 grid (Add Resident, New Rescue, Admission, Medical Entry, Add Visitor, Upload Document).
   - Today's live operational activity feed.
3. **Doctor Dashboard (`DoctorDashboard.tsx`)**:
   - Clinical workload metrics (83 patients, 6 appointments today, 9 follow-ups, 2 critical cases).
   - Today's consultation queue with patient age and reason for visit.
   - Clinical action shortcuts (Consultation, Prescription, Lab Test, Emergency Note).
4. **Caretaker / Nurse Dashboard (`CaretakerDashboard.tsx`)**:
   - Care metrics (Attendance 82/86, 24 medicines due, 6 care tasks, 3 meals served).
   - Interactive daily routine checklist with status toggling.
5. **Accountant Dashboard (`AccountantDashboard.tsx`)**:
   - Monthly income (₹3.85L), expenses (₹2.40L), donations (₹1.85L), pending bills (₹65k).
   - Monthly financial cashflow distribution chart.
   - Quick receipt and expense recording triggers.
6. **Staff Dashboard (`StaffDashboard.tsx`)**:
   - Duty shift tracker (08:00 – 16:00), active on-duty indicator.
   - Assigned operational responsibilities and resident assistance reminders.
7. **Volunteer Dashboard (`VolunteerDashboard.tsx`)**:
   - Volunteer statistics (3 assigned tasks, 1 event, 12 hours logged, 18 seniors assisted).
   - Upcoming recreation event schedule and log activity trigger.
8. **Family Member / Guardian Portal (`FamilyDashboard.tsx`)**:
   - "My Loved One" profile summary (Mr. Ram Prasad, RES-014).
   - Quick access to medical records, medicine schedule, visit logs, and daily updates.
   - Latest health checkup bulletin and "Book a Visit" modal trigger.

---

## 5. Layout and Navigation Framework

The application layout encapsulates both standalone mobile ergonomics and responsive desktop previewing:
* **`AppShell.tsx`**: Mobile-first wrapper (`max-w-md mx-auto`) with a floating desktop frame toggle allowing reviewers to toggle between a centered mobile device container and full-width responsive layout.
* **`MobileHeader.tsx`**: Fixed top app bar displaying brand logo, branch selector dropdown, red-badged notifications bell, and user avatar.
* **`MobileDrawer.tsx`**: Deep purple profile header displaying active user role and avatar, curved white navigation sheet (`rounded-t-[32px]`), full 17-module navigation links with chevrons, in-drawer role switcher, and sign-out action.
* **`MobileBottomNav.tsx`**: 5-item mobile bottom navigation bar with role-aware second and fourth slots and a central elevated purple `+` FAB.
* **`QuickActionSheet.tsx`**: Modal drawer opened by the central `+` FAB presenting permitted quick actions based on the active role.
* **`LogoutConfirmModal.tsx`**: Security confirmation dialog preventing accidental session invalidation.

---

## 6. Shared Component Library

All primitives are located in `src/components/ui/` and adhere to the strict design system:
* `button.tsx`: Purple gradient primary (`from-[#6D28D9] to-[#8B5CF6]`), secondary outline, ghost, and danger variants.
* `card.tsx`: Rounded-2xl / rounded-3xl cards with `#E8E1F5` borders and soft drop shadows (`shadow-card`, `shadow-2xs`).
* `badge.tsx`: Pill badges supporting `default`, `secondary`, `success`, `warning`, `danger`/`destructive`, `info`, and `purple`.
* `input.tsx`: Rounded-2xl form inputs with integrated icon support and purple focus rings.
* `modal.tsx`: Accessible dialog overlay with backdrop blur and smooth entrance transitions.
* `avatar.tsx`: Rounded image container with fallbacks.
* `stat-card.tsx`, `empty-state.tsx`, `loading-spinner.tsx`, `table.tsx`: Supporting dashboard and data presentation components.

---

## 7. Data Models & Type System

`src/types/index.ts` defines comprehensive TypeScript interfaces corresponding to the logical schema:
* **Identity:** `User`, `RoleType`, `Organization`, `Branch`
* **Resident Core:** `Resident`, `EmergencyContact`, `Guardian`
* **Intake:** `RescueCase`, `Admission`
* **Medical:** `MedicalRecord`, `MedicalObservation`, `MedicationSchedule`
* **Operations:** `AttendanceEntry`, `Visitor`, `Visit`, `Room`, `Bed`
* **Finance:** `Donation`, `Expense`
* **System:** `DocumentItem`, `DailyActivity`, `CalendarEvent`, `TaskItem`, `AuditLogEntry`

---

## 8. Git Status & Repository Hygiene

* **Branch:** `master`
* **Working Tree:** Untracked root files from user desktop exist outside project boundary (`../../`), but within `c:\Users\Shubham Saini\Desktop\ngo new version\`, all files are clean, strictly organized, and compile without error.
* **Next.js Cache:** Clean, valid production build cached in `.next/`.
