"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Building2,
  UserCheck,
  LogOut,
  SlidersHorizontal,
  Shield,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { RoleType } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface TopNavbarProps {
  onMobileMenuOpen: () => void;
  onOpenGlobalSearch?: () => void;
}

export function TopNavbar({ onMobileMenuOpen, onOpenGlobalSearch }: TopNavbarProps) {
  const { user, currentRole, switchRole, logout } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const rolesList: { role: RoleType; label: string }[] = [
    { role: "ngo_admin", label: "NGO Admin (All modules)" },
    { role: "doctor", label: "Doctor (Medical focus)" },
    { role: "nurse", label: "Nurse / Caretaker (Care focus)" },
    { role: "accountant", label: "Accountant (Finance focus)" },
    { role: "staff", label: "Operational Staff" },
    { role: "auditor", label: "Auditor (Read-only)" },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90 transition-colors">
      {/* Left Area: Mobile Menu & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Input */}
        <div
          onClick={onOpenGlobalSearch}
          className="flex items-center gap-2 w-full max-w-md h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs text-slate-500 cursor-pointer hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-slate-700 transition-colors"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">Search resident by name, ID, rescue case...</span>
          <kbd className="hidden sm:inline-flex ml-auto h-5 items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 shadow-2xs">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right Area: Branch Selector, Role Switcher, Alerts & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Branch Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
          <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <span>Main Ashram (Delhi)</span>
        </div>

        {/* Role Switcher Pill (Dev / Evaluation Tool) */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800 text-xs font-semibold hover:bg-teal-100 transition-colors"
            title="Switch Simulated Role to test role-aware UX"
          >
            <Shield className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline uppercase">{currentRole.replace("_", " ")}</span>
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Simulate Role (RBAC Preview)
              </div>
              <div className="mt-1 space-y-1">
                {rolesList.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      switchRole(r.role);
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      currentRole === r.role
                        ? "bg-teal-50 text-teal-800 font-semibold dark:bg-teal-950/80 dark:text-teal-300"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{r.label}</span>
                    {currentRole === r.role && <UserCheck className="h-3.5 w-3.5 text-teal-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            title="Notifications & Alerts"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Notifications & Critical Reminders
                </h4>
                <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                  3 unread
                </span>
              </div>
              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto">
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-900/40 text-xs">
                  <div className="font-semibold text-amber-900 dark:text-amber-200">
                    Rescue Intake Pending Assessment
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Case #RC-2026-0091 rescued near Connaught Place requires doctor review.
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                    25 mins ago
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/60 dark:bg-rose-950/30 dark:border-rose-900/40 text-xs">
                  <div className="font-semibold text-rose-900 dark:text-rose-200">
                    Medicine Prescription Expiry
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Metformin for Kamla Devi expires in 2 days.
                  </div>
                  <div className="text-[10px] text-rose-700 dark:text-rose-400 mt-1">
                    1 hour ago
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 text-xs">
                  <div className="font-semibold text-slate-900 dark:text-slate-200">
                    New Visitor Registered
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Suresh Verma checked in to meet Ramnath Verma (Room 104).
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">3 hours ago</div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <Link
                  href="/tasks"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
                >
                  View All Tasks & Reminders
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Avatar name={user?.displayName || "Admin User"} size="sm" />
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {user?.displayName?.split(" ")[0]}
              </span>
              <span className="text-[10px] text-slate-400 capitalize">
                {currentRole.replace("_", " ")}
              </span>
            </div>
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {user?.displayName}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
              </div>

              <div className="mt-1 space-y-1">
                <Link
                  href="/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                  <span>Account & Preferences</span>
                </Link>
                <Link
                  href="/login"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

