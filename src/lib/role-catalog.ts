/**
 * ElderCare OS — Public Registration Account-Type Catalog & Role Routing
 * Super Admin / Platform Owner is strictly excluded from public registration.
 */

export interface AccountTypeOption {
  id: string;
  group: 'A. Medical & Healthcare' | 'B. Care & Operations' | 'C. Administration' | 'D. Family';
  name: string;
  shortDescription: string;
  responsibilities: string[];
  expectedPermissions: string[];
  mapsToRoleSlug: string;
  requiresApproval: boolean;
}

export const PUBLIC_ACCOUNT_TYPES: AccountTypeOption[] = [
  {
    id: 'doctor',
    group: 'A. Medical & Healthcare',
    name: 'Doctor',
    shortDescription: 'Clinical care, resident diagnoses, prescriptions & medical document review.',
    responsibilities: [
      'Manage resident medical profiles & observations',
      'Prescribe medications & review schedules',
      'Approve clinical document extractions',
    ],
    expectedPermissions: ['medical:record:read', 'medical:prescription:create', 'document:approve'],
    mapsToRoleSlug: 'doctor',
    requiresApproval: true,
  },
  {
    id: 'nurse',
    group: 'A. Medical & Healthcare',
    name: 'Nurse',
    shortDescription: 'Daily resident vitals, medication administration & shift handovers.',
    responsibilities: [
      'Record daily vitals & nursing observations',
      'Administer scheduled medications',
      'Maintain daily care diary & shift handovers',
    ],
    expectedPermissions: ['medical:vitals:create', 'medical:schedule:administer', 'diary:create'],
    mapsToRoleSlug: 'nurse',
    requiresApproval: true,
  },
  {
    id: 'caretaker',
    group: 'B. Care & Operations',
    name: 'Caretaker',
    shortDescription: 'Hands-on resident assistance, hygiene, meals & daily care logs.',
    responsibilities: [
      'Assist assigned residents with daily care',
      'Log attendance & daily care diary',
      'Complete assigned care tasks',
    ],
    expectedPermissions: ['resident:read', 'attendance:mark', 'diary:create', 'task:update'],
    mapsToRoleSlug: 'staff',
    requiresApproval: true,
  },
  {
    id: 'staff',
    group: 'B. Care & Operations',
    name: 'Staff',
    shortDescription: 'Operational coordination, visitor check-in & facility upkeep.',
    responsibilities: [
      'Coordinate daily facility operations',
      'Log visitor entries & events',
      'Upload general operational documents',
    ],
    expectedPermissions: ['resident:read', 'visitor:log', 'document:upload', 'event:manage'],
    mapsToRoleSlug: 'staff',
    requiresApproval: true,
  },
  {
    id: 'worker',
    group: 'B. Care & Operations',
    name: 'Worker',
    shortDescription: 'Facility support, meal service, housekeeping & maintenance tasks.',
    responsibilities: [
      'View assigned operational tasks',
      'Log duty attendance',
      'Report facility maintenance issues',
    ],
    expectedPermissions: ['resident:read', 'attendance:mark', 'task:read', 'task:update'],
    mapsToRoleSlug: 'staff',
    requiresApproval: true,
  },
  {
    id: 'volunteer',
    group: 'B. Care & Operations',
    name: 'Volunteer',
    shortDescription: 'Community engagement, cultural events & resident companionship.',
    responsibilities: [
      'Support community events & activities',
      'Log visitor & activity updates',
      'Complete volunteer tasks',
    ],
    expectedPermissions: ['resident:read', 'event:read', 'task:read', 'diary:read'],
    mapsToRoleSlug: 'volunteer',
    requiresApproval: true,
  },
  {
    id: 'ngo_admin',
    group: 'C. Administration',
    name: 'NGO Administrator',
    shortDescription: 'Organization-wide administration, staff approval, billing & exports.',
    responsibilities: [
      'Approve staff registrations & assign roles',
      'Manage branches, admissions & billing',
      'Manage organization settings & exports',
    ],
    expectedPermissions: ['org:member:manage', 'org:subscription:manage', 'org:data:export'],
    mapsToRoleSlug: 'admin',
    requiresApproval: true,
  },
  {
    id: 'branch_admin',
    group: 'C. Administration',
    name: 'Branch Administrator',
    shortDescription: 'Branch-scoped operations, admissions, staff & facility management.',
    responsibilities: [
      'Manage assigned branch residents & rooms',
      'Coordinate branch rescue intake & visitors',
      'Review branch operational reports',
    ],
    expectedPermissions: ['resident:create', 'facility:manage', 'rescue:convert', 'report:read'],
    mapsToRoleSlug: 'admin',
    requiresApproval: true,
  },
  {
    id: 'accountant',
    group: 'C. Administration',
    name: 'Accountant',
    shortDescription: 'Donations, expenses, 80G receipts & financial reporting.',
    responsibilities: [
      'Record donations & issue receipts',
      'Manage operational expense approvals',
      'Generate financial audit reports',
    ],
    expectedPermissions: ['finance:donation:read', 'finance:expense:create', 'finance:report:generate'],
    mapsToRoleSlug: 'accountant',
    requiresApproval: true,
  },
  {
    id: 'family_member',
    group: 'D. Family',
    name: 'Family Member / Guardian',
    shortDescription: 'Restricted portal for linked resident updates & approved documents.',
    responsibilities: [
      'View linked resident profile & updates',
      'View authorized health & visit info',
      'Download approved family documents',
    ],
    expectedPermissions: ['family:resident:view_own'],
    mapsToRoleSlug: 'family_member',
    requiresApproval: true,
  },
];

export const FORBIDDEN_PUBLIC_ROLES = new Set([
  'super_admin',
  'platform_admin',
  'platform_owner',
  'platform_super_admin',
  'root',
]);

export function getAccountTypeById(id: string): AccountTypeOption | null {
  return PUBLIC_ACCOUNT_TYPES.find((t) => t.id === id) || null;
}
