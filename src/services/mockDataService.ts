// ElderCare OS - Multi-Tenant Data Service
// Connects strictly to authenticated, tenant-scoped PostgreSQL REST APIs.
// Silent fixture fallbacks are removed: empty DB returns [], API errors throw.

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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const dataService = {
  async getCurrentUser(): Promise<User | null> {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (data.authenticated && data.session) {
      const s = data.session;
      return {
        id: s.userId,
        email: s.email,
        displayName: s.fullName,
        role: s.roleSlug === "admin" ? "ngo_admin" : (s.roleSlug || "staff"),
        organizationId: s.activeOrgId || "",
        branchId: s.branchId || undefined,
        status: "active",
      };
    }
    return null;
  },

  async getUsers(): Promise<User[]> {
    const data = await fetchJson<{ members: any[] }>("/api/staff");
    return (data.members || []).map((m) => ({
      id: m.user_id,
      email: m.email,
      displayName: m.full_name,
      phone: m.phone || undefined,
      role: m.role_slug === "admin" ? "ngo_admin" : m.role_slug,
      organizationId: "",
      branchId: m.branch_id || undefined,
      status: m.status === "active" ? "active" : "suspended",
    }));
  },

  async getDashboardSummary() {
    const data = await fetchJson<{ report: any }>("/api/reports");
    return data.report;
  },

  async getResidents(query?: { search?: string; status?: string }): Promise<Resident[]> {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.status) params.set("status", query.status);

    const data = await fetchJson<{ residents: any[] }>(`/api/residents?${params.toString()}`);
    return (data.residents || []).map((r) => ({
      id: r.id,
      organizationId: r.organization_id || "",
      branchId: r.branch_id || undefined,
      residentNumber: r.resident_number,
      fullName: r.full_name,
      preferredName: r.preferred_name,
      gender: r.gender,
      dateOfBirthIsEstimated: false,
      identityStatus: r.identity_status || "unverified",
      residentStatus: r.resident_status || "active",
      admittedAt: r.admitted_at,
      roomNumber: r.room_number,
      bedCode: r.bed_code,
      primaryDiagnosis: r.primary_diagnosis,
      createdAt: r.created_at,
    }));
  },

  async getResidentById(id: string): Promise<Resident | null> {
    const residents = await this.getResidents();
    return residents.find((r) => r.id === id) || null;
  },

  async createResident(payload: Partial<Resident>): Promise<Resident> {
    const data = await fetchJson<{ resident: any }>("/api/residents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const r = data.resident;
    return {
      id: r.id,
      organizationId: r.organization_id,
      branchId: r.branch_id || undefined,
      residentNumber: r.resident_number,
      fullName: r.full_name,
      gender: r.gender,
      dateOfBirthIsEstimated: false,
      identityStatus: r.identity_status || "unverified",
      residentStatus: r.resident_status || "active",
      roomNumber: r.room_number,
      bedCode: r.bed_code,
      createdAt: r.created_at,
    };
  },

  async getRescueCases(statusFilter?: string): Promise<RescueCase[]> {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    const data = await fetchJson<{ rescueCases: any[] }>(`/api/rescue-cases?${params.toString()}`);
    return (data.rescueCases || []).map((rc) => ({
      id: rc.id,
      rescueNumber: rc.case_number,
      organizationId: rc.organization_id || "",
      branchId: rc.branch_id || "",
      personName: rc.person_identifier,
      approximateAge: rc.approximate_age || undefined,
      gender: rc.gender || undefined,
      rescueSource: "public_call",
      reportedByPhone: rc.reported_by_phone || undefined,
      rescuedAt: rc.created_at,
      location: { addressText: rc.rescue_location, captureSource: "manual", capturedAt: rc.created_at },
      initialConditionNotes: rc.current_health_status || undefined,
      caseStatus: rc.status,
      urgencyLevel: rc.urgency_level,
      assignedTeamLeaderName: rc.team_leader_name || undefined,
      admittedResidentId: rc.admitted_resident_id || undefined,
      createdAt: rc.created_at,
    }));
  },

  async getAdmissions(): Promise<Admission[]> {
    const data = await fetchJson<{ admissions: any[] }>("/api/admissions");
    return data.admissions || [];
  },

  async getAttendance(date?: string): Promise<AttendanceEntry[]> {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    const data = await fetchJson<{ attendance: any[] }>(`/api/attendance${query}`);
    return data.attendance || [];
  },

  async getRooms(): Promise<Room[]> {
    const data = await fetchJson<{ rooms: any[]; beds: any[] }>("/api/facilities");
    return (data.rooms || []).map((rm) => ({
      id: rm.id,
      buildingName: rm.ward_name,
      roomNumber: rm.room_number,
      floorLabel: `Floor ${rm.floor_number || 1}`,
      capacity: rm.total_beds,
      occupiedCount: (data.beds || []).filter(
        (b) => b.room_id === rm.id && (b.status === "occupied" || b.current_resident_id)
      ).length,
      status: rm.status === "maintenance" ? "maintenance" : rm.status === "full" ? "full" : "available",
    }));
  },

  async getDocuments(): Promise<DocumentItem[]> {
    const data = await fetchJson<{ documents: any[] }>("/api/documents");
    return data.documents || [];
  },

  async getDonations(): Promise<Donation[]> {
    const data = await fetchJson<{ donations: any[] }>("/api/finance/donations");
    return data.donations || [];
  },

  async getTasks(): Promise<TaskItem[]> {
    const data = await fetchJson<{ tasks: any[] }>("/api/tasks");
    return (data.tasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || undefined,
      priority: t.priority,
      status: t.status === "cancelled" ? "completed" : t.status,
      dueAt: t.due_date || t.created_at,
      assignedToName: t.assigned_to_name || "Unassigned",
    }));
  },

  async getVisits(): Promise<Visit[]> {
    const data = await fetchJson<{ visits: any[] }>("/api/visitors");
    return (data.visits || []).map((v) => ({
      id: v.id,
      visitorId: v.visitor_id,
      visitorName: v.visitor_name,
      visitorPhone: v.visitor_phone,
      residentId: v.resident_id || undefined,
      residentName: v.resident_name || "General Visit",
      relationship: v.relationship || "Visitor",
      purpose: v.purpose || "",
      entryAt: v.checked_in_at,
      exitAt: v.checked_out_at || undefined,
      recordedBy: v.logged_by_name || v.logged_by || "Staff",
    }));
  },

  async getDailyActivities(): Promise<DailyActivity[]> {
    const data = await fetchJson<{ entries: any[] }>("/api/diary");
    return (data.entries || []).map((d) => ({
      id: d.id,
      activityDate: d.entry_date,
      title: `${d.shift.charAt(0).toUpperCase() + d.shift.slice(1)} Shift Log`,
      description: d.content,
      createdByName: d.author_name || "Staff",
      createdAt: d.created_at,
    }));
  },
};
