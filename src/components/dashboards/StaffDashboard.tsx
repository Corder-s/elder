"use client";

import React from "react";
import Link from "next/link";
import { Briefcase, ClipboardCheck, Clock, CheckCircle2, AlertCircle, Bell } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function StaffDashboard() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#17133A] dark:text-[#FAF8FF] flex items-center gap-1.5">
            <span>Vikram Singh</span>
            <span className="text-base">📋</span>
          </h2>
          <p className="text-xs text-[#686581] dark:text-[#9D99BA] mt-0.5">
            Operational Staff • Daily Duties & Logistics
          </p>
        </div>
        <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-2.5 py-1 rounded-full">
          Staff
        </span>
      </div>

      {/* Shift Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-soft flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-200">Current Shift</span>
          <h3 className="text-lg font-extrabold mt-0.5">Day Shift (08:00 - 16:00)</h3>
          <span className="text-xs text-purple-100 mt-1 block">Duty Location: Ground Floor Wing A</span>
        </div>
        <span className="text-xs font-bold bg-white text-[#6D28D9] px-3 py-1.5 rounded-full shadow-2xs">
          On Duty
        </span>
      </div>

      {/* Assigned Tasks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-[#686581] uppercase tracking-wider">
            Today's Assigned Responsibilities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-1 text-xs">
          <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] flex items-center justify-between">
            <div>
              <span className="font-bold text-[#17133A] block">Breakfast & Herbal Tea Distribution</span>
              <span className="text-[11px] text-[#686581]">Rooms 101 to 108 • 08:30 AM</span>
            </div>
            <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
              Completed
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] flex items-center justify-between">
            <div>
              <span className="font-bold text-[#17133A] block">Mobility Assistance for Sun-Basking</span>
              <span className="text-[11px] text-[#686581]">Ashram Garden Lawn • 11:00 AM</span>
            </div>
            <span className="text-[10px] font-bold text-[#6D28D9] bg-[#F3E8FF] px-2.5 py-0.5 rounded-full">
              In Progress
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] flex items-center justify-between">
            <div>
              <span className="font-bold text-[#17133A] block">Evening Bhajan Hall Setup</span>
              <span className="text-[11px] text-[#686581]">Main Prayer Room • 05:00 PM</span>
            </div>
            <span className="text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full">
              Pending
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
