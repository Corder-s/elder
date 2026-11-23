"use client";

import React from "react";
import Link from "next/link";
import {
  Stethoscope,
  Calendar,
  AlertCircle,
  Clock,
  Plus,
  Pill,
  ClipboardCheck,
  ChevronRight,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DoctorDashboard() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#17133A] dark:text-[#FAF8FF] flex items-center gap-1.5">
            <span>Dr. A. K. Sengupta</span>
            <span className="text-base">👨‍⚕️</span>
          </h2>
          <p className="text-xs text-[#686581] dark:text-[#9D99BA] mt-0.5">
            Chief Medical Officer • Medical Care
          </p>
        </div>
        <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-2.5 py-1 rounded-full">
          Doctor
        </span>
      </div>

      {/* 4 Metric Cards matching Reference Image 1 */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          Medical Dashboard
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#E0F2FE]/60 border border-[#BAE6FD] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Total Patients</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">83</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#0284C7] text-white flex items-center justify-center">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFE4E6]/60 border border-[#FECDD3] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Today's Appts</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">6</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#E11D48] text-white flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F3E8FF]/60 border border-[#E9D5FF] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Follow-ups</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">9</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#6D28D9] text-white flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FEF3C7]/60 border border-[#FDE68A] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Critical Cases</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">2</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#D97706] text-white flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Appointments matching Reference Image 1 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-[#686581] uppercase tracking-wider">
              Today's Appointments
            </CardTitle>
            <Link href="/events" className="text-xs font-bold text-[#6D28D9]">
              View All &gt;
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {/* Appt 1 */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] text-xs">
            <div>
              <div className="font-bold text-[#17133A]">Mr. Ram Prasad (72)</div>
              <div className="text-[11px] text-[#686581]">General Checkup • Room 101</div>
            </div>
            <span className="font-bold text-[#6D28D9] bg-[#F3E8FF] px-2.5 py-1 rounded-full text-[11px]">
              10:00 AM
            </span>
          </div>

          {/* Appt 2 */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] text-xs">
            <div>
              <div className="font-bold text-[#17133A]">Smt. Shanti Devi (78)</div>
              <div className="text-[11px] text-[#686581]">BP & Diabetes Review • Room 102</div>
            </div>
            <span className="font-bold text-[#6D28D9] bg-[#F3E8FF] px-2.5 py-1 rounded-full text-[11px]">
              11:30 AM
            </span>
          </div>

          {/* Appt 3 */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] text-xs">
            <div>
              <div className="font-bold text-[#17133A]">Mr. Mohan Lal (76)</div>
              <div className="text-[11px] text-[#686581]">Follow-up Consultation • Room 104</div>
            </div>
            <span className="font-bold text-[#6D28D9] bg-[#F3E8FF] px-2.5 py-1 rounded-full text-[11px]">
              04:00 PM
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          Doctor Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/medical-records"
            className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex items-center gap-3 shadow-card"
          >
            <div className="h-10 w-10 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#17133A] block">Add Medical Record</span>
              <span className="text-[10px] text-[#686581]">Diagnosis & clinical notes</span>
            </div>
          </Link>

          <Link
            href="/medicines"
            className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex items-center gap-3 shadow-card"
          >
            <div className="h-10 w-10 rounded-2xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center shrink-0">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#17133A] block">Verify Prescription</span>
              <span className="text-[10px] text-[#686581]">Dose & frequency review</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
