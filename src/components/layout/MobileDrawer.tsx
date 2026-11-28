"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  Users,
  Ambulance,
  UserCheck,
  Stethoscope,
  Pill,
  ClipboardCheck,
  UserPlus,
  Briefcase,
  BedDouble,
  CalendarDays,
  BookOpen,
  FolderLock,
  IndianRupee,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Building2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LogoutConfirmModal } from "./LogoutConfirmModal";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavModule {
  title: string;
  href: string;
  icon: React.ElementType;
  requiredAnyPermissions?: string[];
}

const MODULES: NavModule[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    title: "Residents",
    href: "/residents",
    icon: Users,
    requiredAnyPermissions: ["resident:read", "family:resident:view_own"],
  },
  {
    title: "Rescue Cases",
    href: "/rescue-cases",
    icon: Ambulance,
    requiredAnyPermissions: ["rescue:read"],
  },
  {
    title: "Admissions",
    href: "/admissions",
    icon: UserCheck,
    requiredAnyPermissions: ["resident:create"],
  },
  {
    title: "Medical & Health",
    href: "/medical-records",
    icon: Stethoscope,
    requiredAnyPermissions: ["medical:record:read", "medical:vitals:read"],
  },
  {
    title: "Medicines",
    href: "/medicines",
    icon: Pill,
    requiredAnyPermissions: ["medical:prescription:read", "medical:schedule:administer"],
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: ClipboardCheck,
    requiredAnyPermissions: ["attendance:read"],
  },
  {
    title: "Visitors",
    href: "/visitors",
    icon: UserPlus,
    requiredAnyPermissions: ["visitor:read", "visitor:log"],
  },
  {
    title: "Staff & Approvals",
    href: "/staff",
    icon: Briefcase,
    requiredAnyPermissions: ["org:member:update", "org:member:invite", "org:member:read"],
  },
  {
    title: "Rooms & Facilities",
    href: "/facilities",
    icon: BedDouble,
    requiredAnyPermissions: ["facility:read"],
  },
  {
    title: "Events & Calendar",
    href: "/events",
    icon: CalendarDays,
    requiredAnyPermissions: ["event:read"],
  },
  {
    title: "Daily Diary",
    href: "/diary",
    icon: BookOpen,
    requiredAnyPermissions: ["diary:read"],
  },
  {
    title: "Document Vault",
    href: "/documents",
    icon: FolderLock,
    requiredAnyPermissions: ["document:read", "family:resident:view_own"],
  },
  {
    title: "Donations & Finance",
    href: "/finance",
    icon: IndianRupee,
    requiredAnyPermissions: ["finance:donation:read", "finance:expense:read"],
  },
  {
    title: "Tasks & Reminders",
    href: "/tasks",
    icon: CheckSquare,
    requiredAnyPermissions: ["task:read"],
  },
  {
    title: "Reports & Analytics",
    href: "/reports",
    icon: BarChart3,
    requiredAnyPermissions: ["report:read", "finance:report:generate"],
  },
  { title: "Account & Settings", href: "/settings", icon: Settings },
];

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { user, currentRole, hasPermission, memberships, activeOrgId, switchWorkspace } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!isOpen) return null;

  const roleTitleMap: Record<string, string> = {
    super_admin: "Platform Owner",
    ngo_admin: "NGO Administrator",
    doctor: "Doctor / Medical Officer",
    nurse: "Nurse / Caregiver",
    accountant: "Accountant",
    staff: "Operations Staff",
    volunteer: "Volunteer",
    family_guardian: "Family Member",
    auditor: "Auditor",
  };

  const visibleModules = MODULES.filter((item) => {
    if (!item.requiredAnyPermissions || item.requiredAnyPermissions.length === 0) return true;
    return item.requiredAnyPermissions.some((p) => hasPermission(p));
  });

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#17133A]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Left-side Drawer Navigation */}
      <div className="fixed top-0 bottom-0 left-0 z-50 w-full max-w-xs bg-[#4C1D95] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-left duration-250">
        <div className="p-5 pt-7 pb-8 bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full">
              ElderCare OS
            </span>
            <button
              onClick={onClose}
              aria-label="Close navigation menu"
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-full bg-white/20 border-2 border-white shadow-md shrink-0 flex items-center justify-center font-black text-base">
              {(user?.displayName || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-black text-white truncate">
                {user?.displayName || "Authenticated User"}
              </h4>
              <p className="text-xs text-[#E9D5FF] font-medium truncate">
                {roleTitleMap[currentRole] || currentRole}
              </p>
            </div>
          </div>

          {memberships.length > 1 && (
            <div className="mt-4 pt-3 border-t border-white/15">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#E9D5FF] mb-1.5">
                <Building2 className="h-3 w-3" />
                <span>Active Workspace</span>
              </div>
              <select
                value={activeOrgId || ""}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="w-full h-8 rounded-xl border border-white/20 bg-white/15 text-white px-2.5 text-xs font-semibold focus:outline-none focus:bg-[#3B1376]"
              >
                {memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId} className="text-[#17133A] bg-white">
                    {m.organizationName} ({m.roleName})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex-1 bg-white rounded-t-[32px] -mt-5 pt-5 pb-2 px-3 overflow-y-auto space-y-1 shadow-2xl">
          {visibleModules.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                  isActive
                    ? "bg-[#F3E8FF] text-[#6D28D9] font-black shadow-2xs"
                    : "text-[#17133A] font-semibold hover:bg-[#FAF8FF] hover:text-[#6D28D9]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-[#6D28D9]" : "text-[#686581]"}`} />
                  <span className="text-[12px]">{item.title}</span>
                </div>
                <ChevronRight className={`h-4 w-4 ${isActive ? "text-[#6D28D9]" : "text-[#686581]/50"}`} />
              </Link>
            );
          })}
        </div>

        <div className="p-4 bg-white border-t border-[#E8E1F5]">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold text-[#E11D48] bg-[#FFE4E6] hover:bg-[#FECDD3] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <LogoutConfirmModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} />
    </>
  );
}
