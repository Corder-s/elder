// ElderCare OS - Frontend Type Definitions
// Corresponds strictly to database-schema.md and api-specification.md

export type RoleType =
  | "super_admin"
  | "ngo_admin"
  | "doctor"
  | "nurse"
  | "accountant"
  | "staff"
  | "volunteer"
  | "family_guardian"
  | "auditor";

export interface User {
  id: string;
  email: string;
  phone?: string;
  displayName: string;
  role: RoleType;
  organizationId: string;
  branchId?: string;
  status: "active" | "suspended" | "pending";
  avatarUrl?: string;
  lastLoginAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  timezone: string;
  defaultCurrency: string;
  status: "active" | "inactive";
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status: "active" | "inactive";
}

export type ResidentStatus =
  | "active"
  | "temporary_leave"
  | "hospitalized"
  | "discharged"
  | "reunited"
  | "deceased";

export interface ResidentContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isEmergencyContact: boolean;
  isPrimaryContact: boolean;
}

export interface Resident {
  id: string;
  organizationId: string;
  branchId: string;
  residentNumber: string;
  fullName: string;
  preferredName?: string;
  dateOfBirth?: string;
  ageEstimate?: number;
  dateOfBirthIsEstimated: boolean;
  gender: "male" | "female" | "other";
  profilePhotoUrl?: string;
  identityStatus: "verified" | "unverified" | "unknown";
  residentStatus: ResidentStatus;
  admittedAt?: string;
  roomNumber?: string;
  bedCode?: string;
  primaryDiagnosis?: string;
  emergencyContact?: ResidentContact;
  allergiesCount?: number;
  activeMedicationsCount?: number;
  createdAt: string;
}

export type RescueStatus =
  | "new"
  | "under_assessment"
  | "hospitalized"
  | "family_tracing"
  | "temporary_shelter"
  | "admitted"
  | "reunited"
  | "referred"
  | "closed";

export interface RescueLocation {
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  addressText: string;
  captureSource: "gps" | "manual" | "geocoded";
  capturedAt: string;
}

export interface RescueCase {
  id: string;
  rescueNumber: string;
  organizationId: string;
  branchId: string;
  personName?: string;
  approximateAge?: number;
  gender?: "male" | "female" | "other";
  rescueSource: "public_call" | "police" | "hospital" | "outreach" | "walk_in";
  reportedByName?: string;
  reportedByPhone?: string;
  rescuedAt: string;
  location: RescueLocation;
  initialConditionNotes?: string;
  immediateNeeds?: string;
  caseStatus: RescueStatus;
  linkedResidentId?: string;
  assignedTeamMember?: string;
  photoUrl?: string;
  createdAt: string;
}

export type AdmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "withdrawn";

export interface Admission {
  id: string;
  admissionNumber: string;
  residentId: string;
  residentName: string;
  rescueCaseId?: string;
  applicationSource: "rescue_conversion" | "direct_walk_in" | "hospital_referral" | "police_referral";
  applicationStatus: AdmissionStatus;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  decisionNotes?: string;
  allocatedRoomId?: string;
  allocatedRoomNumber?: string;
  allocatedBedId?: string;
  allocatedBedCode?: string;
}

export interface MedicalRecord {
  id: string;
  residentId: string;
  residentName: string;
  recordType: "clinical_note" | "lab_report" | "discharge_summary" | "doctor_visit";
  recordedAt: string;
  summary: string;
  doctorName?: string;
  doctorRegNumber?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  sourceDocumentId?: string;
}

export interface MedicalObservation {
  id: string;
  residentId: string;
  observationType: "blood_pressure" | "blood_sugar" | "temperature" | "pulse" | "spo2" | "weight";
  valueNumeric?: number;
  valueText?: string;
  unit: string;
  observedAt: string;
  notes?: string;
  recordedBy: string;
}

export interface MedicationSchedule {
  id: string;
  residentId: string;
  residentName: string;
  medicineName: string;
  instructions: string;
  doseText: string;
  frequencyText: string;
  startDate: string;
  endDate?: string;
  status: "active" | "completed" | "discontinued";
  prescriberName: string;
  timingSlots: string[]; // e.g. ["08:00 AM", "02:00 PM", "08:00 PM"]
}

export interface AttendanceEntry {
  id: string;
  residentId: string;
  residentName: string;
  roomNumber?: string;
  attendanceDate: string;
  status: "present" | "absent" | "on_leave" | "hospitalized" | "outside_premises";
  recordedAt: string;
  recordedBy: string;
  notes?: string;
}

export interface Visitor {
  id: string;
  fullName: string;
  phone: string;
  address?: string;
  photoUrl?: string;
}

export interface Visit {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorPhone: string;
  residentId?: string;
  residentName?: string;
  relationship?: string;
  purpose: string;
  entryAt: string;
  exitAt?: string;
  recordedBy: string;
}

export interface Room {
  id: string;
  buildingName?: string;
  roomNumber: string;
  floorLabel?: string;
  capacity: number;
  occupiedCount: number;
  status: "available" | "full" | "maintenance";
}

export interface Bed {
  id: string;
  roomId: string;
  roomNumber: string;
  bedCode: string;
  status: "available" | "occupied" | "maintenance";
  currentResidentId?: string;
  currentResidentName?: string;
}

export interface Donation {
  id: string;
  receiptNumber: string;
  donorName: string;
  donorPhone?: string;
  donorEmail?: string;
  amount: number;
  currency: string;
  donatedAt: string;
  paymentMethod: "cash" | "upi" | "bank_transfer" | "cheque";
  purpose?: string;
  status: "completed" | "pending";
}

export interface Expense {
  id: string;
  category: "groceries" | "medical_supplies" | "utilities" | "maintenance" | "salaries" | "other";
  amount: number;
  currency: string;
  spentAt: string;
  payee: string;
  description: string;
  receiptUrl?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: "identity" | "medical" | "admission" | "legal" | "financial" | "government";
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedByName: string;
  linkedEntityType?: "resident" | "rescue_case" | "staff" | "organization";
  linkedEntityId?: string;
  linkedEntityName?: string;
  ocrStatus: "none" | "pending" | "completed" | "failed";
  expiresAt?: string;
}

export interface DailyActivity {
  id: string;
  activityDate: string;
  title: string;
  description: string;
  completedWork?: string;
  pendingWork?: string;
  participantCount?: number;
  createdByName: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  eventType: "medical_camp" | "festival" | "inspection" | "birthday" | "donor_visit";
  startsAt: string;
  endsAt?: string;
  location?: string;
  status: "scheduled" | "completed" | "cancelled";
  description?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed";
  dueAt: string;
  assignedToName?: string;
  relatedEntityType?: string;
  relatedEntityName?: string;
}

