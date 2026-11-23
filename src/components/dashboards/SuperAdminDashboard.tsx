"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Ambulance,
  UserCheck,
  Shield,
  Settings,
  History,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SuperAdminDashboard() {
  return (
    <div className="space-y-5">
      {/* Top Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#17133A] dark:text-[#FAF8FF] flex items-center gap-1.5">
            <span>Good Morning, Super Admin</span>
            <span>👋</span>
          </h2>
          <p className="text-xs text-[#686581] dark:text-[#9D99BA] mt-0.5">
            System Control & Multi-Branch Overview
          </p>
        </div>
        <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-2.5 py-1 rounded-full">
          Super Admin
        </span>
      </div>

      {/* 4 System Metric Cards (2x2 grid matching Reference 1) */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          System Overview
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between dark:bg-[#1B1638] dark:border-[#2C2554]">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Branches</span>
              <span className="text-2xl font-black text-[#17133A] dark:text-white mt-0.5 block">3</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between dark:bg-[#1B1638] dark:border-[#2C2554]">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Total Users</span>
              <span className="text-2xl font-black text-[#17133A] dark:text-white mt-0.5 block">48</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between dark:bg-[#1B1638] dark:border-[#2C2554]">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Residents</span>
              <span className="text-2xl font-black text-[#17133A] dark:text-white mt-0.5 block">286</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between dark:bg-[#1B1638] dark:border-[#2C2554]">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Active Cases</span>
              <span className="text-2xl font-black text-[#17133A] dark:text-white mt-0.5 block">12</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <Ambulance className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Residents by Status Donut Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-[#686581] uppercase tracking-wider">
            Residents by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between pt-1">
            {/* Visual Ring representation */}
            <div className="relative flex items-center justify-center h-28 w-28 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#E8E1F5"
                  strokeWidth="3.8"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#6D28D9"
                  strokeWidth="3.8"
                  strokeDasharray="85, 100"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#E11D48"
                  strokeWidth="3.8"
                  strokeDasharray="6, 100"
                  strokeDashoffset="-85"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-[#17133A] dark:text-white leading-none">286</span>
                <span className="text-[9px] font-semibold text-[#686581] mt-0.5">Residents</span>
              </div>
            </div>

            {/* Breakdown legend */}
            <div className="space-y-1.5 text-xs flex-1 pl-6">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#686581]">
                  <span className="h-2 w-2 rounded-full bg-[#6D28D9]" />
                  Active
                </span>
                <span className="font-bold text-[#17133A] dark:text-white">242</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#686581]">
                  <span className="h-2 w-2 rounded-full bg-[#E11D48]" />
                  Hospital
                </span>
                <span className="font-bold text-[#17133A] dark:text-white">18</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#686581]">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  Leave
                </span>
                <span className="font-bold text-[#17133A] dark:text-white">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#686581]">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Inactive
                </span>
                <span className="font-bold text-[#17133A] dark:text-white">14</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions (4 Items matching Reference 1) */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          Quick Actions
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <Link
            href="/settings"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex flex-col items-center justify-center gap-1.5 text-center shadow-card dark:bg-[#1B1638]"
          >
            <div className="h-9 w-9 rounded-xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-[#17133A] dark:text-white leading-tight">
              Manage Branches
            </span>
          </Link>

          <Link
            href="/settings"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex flex-col items-center justify-center gap-1.5 text-center shadow-card dark:bg-[#1B1638]"
          >
            <div className="h-9 w-9 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-[#17133A] dark:text-white leading-tight">
              Manage Users
            </span>
          </Link>

          <Link
            href="/settings"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex flex-col items-center justify-center gap-1.5 text-center shadow-card dark:bg-[#1B1638]"
          >
            <div className="h-9 w-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <Settings className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-[#17133A] dark:text-white leading-tight">
              System Settings
            </span>
          </Link>

          <Link
            href="/settings"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex flex-col items-center justify-center gap-1.5 text-center shadow-card dark:bg-[#1B1638]"
          >
            <div className="h-9 w-9 rounded-xl bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center">
              <History className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-[#17133A] dark:text-white leading-tight">
              Audit Logs
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
