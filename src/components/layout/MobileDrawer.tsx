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
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LogoutConfirmModal } from "./LogoutConfirmModal";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODULES = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Residents", href: "/residents", icon: Users },
  { title: "Rescue Cases", href: "/rescue-cases", icon: Ambulance },
  { title: "Admissions", href: "/admissions", icon: UserCheck },
  { title: "Medical & Health", href: "/medical-records", icon: Stethoscope },
  { title: "Medicines", href: "/medicines", icon: Pill },
  { title: "Attendance", href: "/attendance", icon: ClipboardCheck },
  { title: "Visitors", href: "/visitors", icon: UserPlus },
  { title: "Staff & Volunteers", href: "/staff", icon: Briefcase },
  { title: "Rooms & Facilities", href: "/facilities", icon: BedDouble },
  { title: "Events & Calendar", href: "/events", icon: CalendarDays },
  { title: "Daily Diary", href: "/diary", icon: BookOpen },
  { title: "Documents", href: "/documents", icon: FolderLock },
  { title: "Donations & Finance", href: "/finance", icon: IndianRupee },
  { title: "Tasks & Reminders", href: "/tasks", icon: CheckSquare },
  { title: "Reports & Analytics", href: "/reports", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { user, currentRole, switchRole, availableRoles } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!isOpen) return null;

  const roleTitleMap: Record<string, string> = {
    super_admin: "Super Admin",
    ngo_admin: "Super Admin",
    doctor: "Chief Medical Officer",
    nurse: "Lead Caregiver",
    accountant: "Accounts Manager",
    staff: "Operations Staff",
    volunteer: "Active Volunteer",
    family_guardian: "Family Guardian",
    auditor: "Auditor",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-[#17133A]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container matching Reference Image Screen 4 */}
      <div className="fixed top-0 bottom-0 right-0 z-50 w-full max-w-xs bg-[#4C1D95] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Purple Profile Header matching Reference Image Screen 4 */}
        <div className="p-5 pt-7 pb-8 bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full">
              ElderCare OS
            </span>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center gap-3.5">
            <div className="h-13 w-13 rounded-full overflow-hidden bg-white/20 border-2 border-white shadow-md shrink-0">
              <img
                src={
                  user?.avatarUrl ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                }
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-black text-white truncate">
                {user?.displayName || "Admin"}
              </h4>
              <p className="text-xs text-[#E9D5FF] font-medium truncate">
                {roleTitleMap[currentRole] || currentRole}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/80 shrink-0" />
          </div>

          {/* In-Drawer Role Switcher */}
          <div className="mt-4 pt-3 border-t border-white/15">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#E9D5FF] mb-1.5">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>Switch Role:</span>
              </span>
            </div>
            <select
              value={currentRole}
              onChange={(e) => switchRole(e.target.value as any)}
              className="w-full h-8 rounded-xl border border-white/20 bg-white/15 text-white px-2.5 text-xs font-semibold focus:outline-none focus:bg-[#3B1376]"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r} className="text-[#17133A] bg-white">
                  {r.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* White Rounded Navigation Panel matching Reference Image Screen 4 */}
        <div className="flex-1 bg-white rounded-t-[32px] -mt-5 pt-5 pb-2 px-3 overflow-y-auto space-y-1 shadow-2xl">
          {MODULES.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

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
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 ${
                      isActive ? "text-[#6D28D9]" : "text-[#686581]"
                    }`}
                  />
                  <span className="text-[12px]">{item.title}</span>
                </div>
                <ChevronRight
                  className={`h-4 w-4 ${
                    isActive ? "text-[#6D28D9]" : "text-[#686581]/50"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        {/* Drawer Bottom Action (Logout) */}
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

      {/* Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
    </>
  );
}
