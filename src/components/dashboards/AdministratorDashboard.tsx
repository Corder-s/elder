"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  BedDouble,
  Ambulance,
  HeartPulse,
  UserPlus,
  IndianRupee,
  CheckCircle2,
  Stethoscope,
  ClipboardCheck,
  UploadCloud,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdministratorDashboard() {
  return (
    <div className="space-y-4">
      {/* Greeting Section matching Reference Image Screen 3 */}
      <div>
        <h2 className="text-xl font-black text-[#17133A] flex items-center gap-1.5">
          <span>Good Morning, Admin</span>
          <span>👏</span>
        </h2>
        <p className="text-xs text-[#686581] mt-0.5">
          Here's what's happening today.
        </p>
      </div>

      {/* 6 Pastel Statistics Cards matching Reference Image Screen 3 (2 columns x 3 rows) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Total Residents (Soft Lavender) */}
        <Link
          href="/residents"
          className="p-3.5 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE]/70 hover:border-[#6D28D9]/40 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-lg bg-[#6D28D9] text-white flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
            <span className="text-xl font-black text-[#17133A]">86</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#17133A] block">
              Total Residents
            </span>
            <span className="text-[10px] font-semibold text-[#16A34A] flex items-center gap-0.5 mt-0.5">
              <span>↑ +4 this month</span>
            </span>
          </div>
        </Link>

        {/* Card 2: Admitted (Soft Mint Green) */}
        <Link
          href="/admissions"
          className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]/70 hover:border-[#16A34A]/40 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-lg bg-[#16A34A] text-white flex items-center justify-center shrink-0">
              <BedDouble className="h-3.5 w-3.5" />
            </div>
            <span className="text-xl font-black text-[#17133A]">82</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#17133A] block">
              Admitted
            </span>
            <span className="text-[10px] font-semibold text-[#16A34A] flex items-center gap-0.5 mt-0.5">
              <span>↑ +3 this month</span>
            </span>
          </div>
        </Link>

        {/* Card 3: Rescue Cases (Soft Amber / Peach) */}
        <Link
          href="/rescue-cases"
          className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]/70 hover:border-[#D97706]/40 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-lg bg-[#D97706] text-white flex items-center justify-center shrink-0">
              <Ambulance className="h-3.5 w-3.5" />
            </div>
            <span className="text-xl font-black text-[#17133A]">5</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#17133A] block">
              Rescue Cases
            </span>
            <span className="text-[10px] font-semibold text-[#D97706] block mt-0.5">
              2 pending action
            </span>
          </div>
        </Link>

        {/* Card 4: Medical Appointments (Soft Rose) */}
        <Link
          href="/medical-records"
          className="p-3.5 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3]/70 hover:border-[#E11D48]/40 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-lg bg-[#E11D48] text-white flex items-center justify-center shrink-0">
              <HeartPulse className="h-3.5 w-3.5" />
            </div>
            <span className="text-xl font-black text-[#17133A]">6</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#17133A] block">
              Medical Appointments
            </span>
            <span className="text-[10px] font-semibold text-[#686581] block mt-0.5">
              Today
            </span>
          </div>
        </Link>

        {/* Card 5: Today's Visitors (Soft Sky Blue) */}
        <Link
          href="/visitors"
          className="p-3.5 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD]/70 hover:border-[#0284C7]/40 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-lg bg-[#0284C7] text-white flex items-center justify-center shrink-0">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <span className="text-xl font-black text-[#17133A]">14</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#17133A] block">
              Today's Visitors
            </span>
            <span className="text-[10px] font-semibold text-[#16A34A] flex items-center gap-0.5 mt-0.5">
              <span>↑ +5 inside</span>
            </span>
          </div>
        </Link>

        {/* Card 6: Donations (Soft Light Purple) */}
        <Link
          href="/finance"
          className="p-3.5 rounded-2xl bg-[#FAF5FF] border border-[#E9D5FF]/70 hover:border-[#6D28D9]/40 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-lg bg-[#6D28D9] text-white flex items-center justify-center shrink-0">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-black text-[#17133A]">₹ 1,85,000</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#17133A] block">
              Donations (This Month)
            </span>
            <span className="text-[10px] font-semibold text-[#16A34A] flex items-center gap-0.5 mt-0.5">
              <span>↑ +22% from last month</span>
            </span>
          </div>
        </Link>
      </div>

      {/* Quick Actions Header & 2x3 Grid matching Reference Image Screen 3 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black text-[#17133A]">Quick Actions</h3>
          <Link
            href="/residents"
            className="text-xs font-bold text-[#6D28D9] hover:underline flex items-center"
          >
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Action 1: Add Resident */}
          <Link
            href="/residents"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9]/40 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
              <UserPlus className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A] leading-tight">
              Add Resident
            </span>
          </Link>

          {/* Action 2: New Rescue */}
          <Link
            href="/rescue-cases"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9]/40 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center">
              <Ambulance className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A] leading-tight">
              New Rescue
            </span>
          </Link>

          {/* Action 3: Admission */}
          <Link
            href="/admissions"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9]/40 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
              <ClipboardCheck className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A] leading-tight">
              Admission
            </span>
          </Link>

          {/* Action 4: Medical Entry */}
          <Link
            href="/medical-records"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9]/40 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
              <Stethoscope className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A] leading-tight">
              Medical Entry
            </span>
          </Link>

          {/* Action 5: Add Visitor */}
          <Link
            href="/visitors"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9]/40 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <Users className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A] leading-tight">
              Add Visitor
            </span>
          </Link>

          {/* Action 6: Upload Document */}
          <Link
            href="/documents"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9]/40 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition-all"
          >
            <div className="h-9 w-9 rounded-xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
              <UploadCloud className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A] leading-tight">
              Upload Document
            </span>
          </Link>
        </div>
      </div>

      {/* Today's Activities matching Reference Image Screen 3 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black text-[#17133A]">Today's Activities</h3>
          <Link
            href="/diary"
            className="text-xs font-bold text-[#6D28D9] hover:underline flex items-center"
          >
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#17133A]">
                New resident admitted
              </h4>
              <p className="text-[11px] text-[#686581]">
                Mr. Ram Prasad (Age 72)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#686581]">
            10:24 AM
          </span>
        </div>
      </div>
    </div>
  );
}
