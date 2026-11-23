// ElderCare OS - Multi-Tenant Data Service
// Connects to tenant-scoped REST endpoints with transparent dev fixture fallback.

import {
  Resident,
  RescueCase,
  Admission,
  TaskItem,
  User,
  AttendanceEntry,
  Visit,
  Room,
  DocumentItem,
  Donation,
  DailyActivity,
} from "@/types";
import {
  DEV_FIXTURE_RESIDENTS,
  DEV_FIXTURE_RESCUES,
  DEV_FIXTURE_ADMISSIONS,
  DEV_FIXTURE_TASKS,
  DEV_FIXTURE_DAILY_STATS,
  DEV_FIXTURE_CURRENT_USER,
  DEV_FIXTURE_USERS,
  DEV_FIXTURE_ATTENDANCE,
  DEV_FIXTURE_VISITS,
  DEV_FIXTURE_ROOMS,
  DEV_FIXTURE_DOCUMENTS,
  DEV_FIXTURE_DONATIONS,
  DEV_FIXTURE_DAILY_ACTIVITIES,
} from "./fixtures";

const delay = (ms: number = 80) => new Promise((resolve) => setTimeout(resolve, ms));

export const dataService = {
  // Current user
  async getCurrentUser(): Promise<User> {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.session) {
          const s = data.session;
          return {
            id: s.userId,
            email: s.email,
            displayName: s.fullName,
            role: s.roleSlug === "admin" ? "ngo_admin" : (s.roleSlug || "staff"),
            organizationId: s.activeOrgId || "org-01",
            branchId: s.branchId || "branch-01",
            status: "active",
          };
        }
      }
    } catch {}
    return { ...DEV_FIXTURE_CURRENT_USER };
  },

  // Users / Staff
  async getUsers(): Promise<User[]> {
    await delay(50);
    return [...DEV_FIXTURE_USERS];
  },

  // Dashboard Stats
  async getDashboardSummary() {
    await delay(50);
    return { ...DEV_FIXTURE_DAILY_STATS };
  },

  // Residents (Connected to PostgreSQL RLS API)
  async getResidents(query?: { search?: string; status?: string }): Promise<Resident[]> {
    try {
      const params = new URLSearchParams();
      if (query?.search) params.set("search", query.search);
      if (query?.status) params.set("status", query.status);

      const res = await fetch(`/api/residents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.residents && data.residents.length > 0) {
          return data.residents.map((r: any) => ({
            id: r.id,
            organizationId: r.organization_id || "org-01",
            branchId: r.branch_id || "branch-01",
            residentNumber: r.resident_number,
            fullName: r.full_name,
            preferredName: r.preferred_name,
            gender: r.gender,
            dateOfBirthIsEstimated: false,
            identityStatus: r.identity_status || "verified",
            residentStatus: r.resident_status || "active",
            admittedAt: r.admitted_at,
            roomNumber: r.room_number,
            bedCode: r.bed_code,
            primaryDiagnosis: r.primary_diagnosis,
            createdAt: r.created_at,
          }));
        }
      }
    } catch {}

    // Fallback to development fixtures if offline or database empty
    let list = [...DEV_FIXTURE_RESIDENTS];
    if (query?.search) {
      const q = query.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.residentNumber.toLowerCase().includes(q)
      );
    }
    if (query?.status && query.status !== "all") {
      list = list.filter((r) => r.residentStatus === query.status);
    }
    return list;
  },

  async getResidentById(id: string): Promise<Resident | null> {
    const residents = await this.getResidents();
    return residents.find((r) => r.id === id) || null;
  },

  async createResident(data: Partial<Resident>): Promise<Resident> {
    try {
      const res = await fetch("/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.resident) {
          return {
            id: result.resident.id,
            organizationId: result.resident.organization_id,
            branchId: result.resident.branch_id || "branch-01",
            residentNumber: result.resident.resident_number,
            fullName: result.resident.full_name,
            gender: result.resident.gender,
            dateOfBirthIsEstimated: false,
            identityStatus: "verified",
            residentStatus: result.resident.resident_status || "active",
            roomNumber: result.resident.room_number,
            bedCode: result.resident.bed_code,
            createdAt: result.resident.created_at,
          };
        }
      }
    } catch {}

    const newResident: Resident = {
      id: `res-${Date.now()}`,
      organizationId: "org-01",
      branchId: "branch-01",
      residentNumber: `RES-${Math.floor(100 + Math.random() * 900)}`,
      fullName: data.fullName || "New Resident",
      gender: data.gender || "male",
      dateOfBirthIsEstimated: false,
      identityStatus: "unverified",
      residentStatus: "active",
      createdAt: new Date().toISOString(),
      ...data,
    };
    return newResident;
  },

  // Rescue Cases
  async getRescueCases(statusFilter?: string): Promise<RescueCase[]> {
    await delay(60);
    if (statusFilter && statusFilter !== "all") {
      return DEV_FIXTURE_RESCUES.filter((c) => c.caseStatus === statusFilter);
    }
    return [...DEV_FIXTURE_RESCUES];
  },

  // Admissions
  async getAdmissions(): Promise<Admission[]> {
    try {
      const res = await fetch("/api/admissions");
      if (res.ok) {
        const data = await res.json();
        if (data.admissions && data.admissions.length > 0) {
          return data.admissions;
        }
      }
    } catch {}
    return [...DEV_FIXTURE_ADMISSIONS];
  },

  // Attendance
  async getAttendance(date?: string): Promise<AttendanceEntry[]> {
    try {
      const query = date ? `?date=${date}` : "";
      const res = await fetch(`/api/attendance${query}`);
      if (res.ok) {
        const data = await res.json();
        if (data.attendance && data.attendance.length > 0) {
          return data.attendance;
        }
      }
    } catch {}
    return [...DEV_FIXTURE_ATTENDANCE];
  },

  // Rooms & Facilities
  async getRooms(): Promise<Room[]> {
    await delay(50);
    return [...DEV_FIXTURE_ROOMS];
  },

  // Documents
  async getDocuments(): Promise<DocumentItem[]> {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
          return data.documents;
        }
      }
    } catch {}
    return [...DEV_FIXTURE_DOCUMENTS];
  },

  // Donations
  async getDonations(): Promise<Donation[]> {
    try {
      const res = await fetch("/api/finance/donations");
      if (res.ok) {
        const data = await res.json();
        if (data.donations && data.donations.length > 0) {
          return data.donations;
        }
      }
    } catch {}
    return [...DEV_FIXTURE_DONATIONS];
  },

  // Tasks
  async getTasks(): Promise<TaskItem[]> {
    await delay(50);
    return [...DEV_FIXTURE_TASKS];
  },

  // Visits
  async getVisits(): Promise<Visit[]> {
    await delay(50);
    return [...DEV_FIXTURE_VISITS];
  },

  // Daily Activities
  async getDailyActivities(): Promise<DailyActivity[]> {
    await delay(50);
    return [...DEV_FIXTURE_DAILY_ACTIVITIES];
  },
};
