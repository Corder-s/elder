"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  medicalOnly?: boolean;
  financeOnly?: boolean;
}

const navModules: NavItem[] = [
  { title: "Overview", href: "/", icon: LayoutDashboard },
  { title: "Residents", href: "/residents", icon: Users, badge: "48" },
  { title: "Rescue Cases", href: "/rescue-cases", icon: Ambulance, badge: "3", badgeColor: "bg-amber-100 text-amber-800" },
  { title: "Admissions", href: "/admissions", icon: UserCheck },
  { title: "Medical Records", href: "/medical-records", icon: Stethoscope, badge: "Restricted", badgeColor: "bg-rose-100 text-rose-800", medicalOnly: true },
  { title: "Medicines", href: "/medicines", icon: Pill, medicalOnly: true },
  { title: "Attendance", href: "/attendance", icon: ClipboardCheck },
  { title: "Visitors", href: "/visitors", icon: UserPlus },
  { title: "Staff & Volunteers", href: "/staff", icon: Briefcase },
  { title: "Rooms & Facilities", href: "/facilities", icon: BedDouble },
  { title: "Events & Calendar", href: "/events", icon: CalendarDays },
  { title: "Daily Diary", href: "/diary", icon: BookOpen },
  { title: "Documents Vault", href: "/documents", icon: FolderLock },
  { title: "Donations & Finance", href: "/finance", icon: IndianRupee, financeOnly: true },
  { title: "Tasks & Reminders", href: "/tasks", icon: CheckSquare, badge: "5", badgeColor: "bg-sky-100 text-sky-800" },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { currentRole } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950",
          // Desktop width
          isCollapsed ? "lg:w-20" : "lg:w-64",
          // Mobile state
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white shadow-md shadow-teal-500/20">
              <HeartHandshake className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  ElderCare<span className="text-teal-600 dark:text-teal-400">OS</span>
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Care & NGO Platform
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navModules.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            // Role warning or notice
            const isRestrictedForUser =
              (item.medicalOnly && currentRole === "accountant") ||
              (item.financeOnly && (currentRole === "doctor" || currentRole === "nurse"));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 select-none",
                  isActive
                    ? "bg-teal-50 text-teal-800 shadow-sm dark:bg-teal-950/60 dark:text-teal-300"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200",
                  isRestrictedForUser && "opacity-60"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive
                      ? "text-teal-600 dark:text-teal-400"
                      : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  )}
                />

                {!isCollapsed && (
                  <div className="flex flex-1 items-center justify-between overflow-hidden">
                    <span className="truncate">{item.title}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                          item.badgeColor || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Tooltip for collapsed desktop */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 hidden rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-lg group-hover:block dark:bg-slate-100 dark:text-slate-900 z-50 whitespace-nowrap">
                    {item.title}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer Organization & Security Badge */}
        {!isCollapsed && (
          <div className="p-3 m-3 rounded-xl bg-slate-50 border border-slate-200/60 dark:bg-slate-900/60 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  Shanti Dham Ashram
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Branch: Main Home (Delhi)
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

