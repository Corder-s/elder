"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  Search,
  CheckCircle2,
  Clock,
  ArrowLeft,
  UserCheck,
  AlertCircle,
  Building,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/services/mockDataService";
import { AttendanceEntry } from "@/types";

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    dataService.getAttendance().then(setAttendance);
  }, []);

  const toggleStatus = (id: string, current: string) => {
    setAttendance((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: current === "present" ? "absent" : "present",
            }
          : item
      )
    );
  };

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const hospitalizedCount = attendance.filter((a) => a.status === "hospitalized").length;

  const filtered = attendance.filter((item) => {
    const matchesSearch =
      item.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.roomNumber ? item.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) : false);
    const matchesFilter = filter === "all" || item.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#17133A]">Attendance</h1>
              <p className="text-[11px] text-[#686581]">Daily resident head-count & check</p>
            </div>
          </div>
          <Badge variant="purple" className="px-2.5 py-1">
            {presentCount}/{attendance.length} Present
          </Badge>
        </div>

        {/* Quick Stat Highlights */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-white border border-[#E8E1F5] text-center shadow-2xs">
            <span className="text-lg font-black text-[#16A34A] block">{presentCount}</span>
            <span className="text-[10px] font-bold text-[#686581] uppercase">Present</span>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-[#E8E1F5] text-center shadow-2xs">
            <span className="text-lg font-black text-[#E11D48] block">{hospitalizedCount}</span>
            <span className="text-[10px] font-bold text-[#686581] uppercase">Hospital</span>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-[#E8E1F5] text-center shadow-2xs">
            <span className="text-lg font-black text-[#6D28D9] block">{attendance.length}</span>
            <span className="text-[10px] font-bold text-[#686581] uppercase">Total</span>
          </div>
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search resident or room..."
          icon={<Search className="h-4 w-4 text-[#686581]" />}
          className="h-11 rounded-2xl bg-white border-[#E8E1F5] text-xs"
        />

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {["all", "present", "hospitalized", "absent"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filter === st
                  ? "bg-[#6D28D9] text-white shadow-soft"
                  : "bg-white text-[#686581] border border-[#E8E1F5]"
              }`}
            >
              {st === "all" ? "All Residents" : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        {/* Attendance List */}
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const isPresent = item.status === "present";
            const isHospitalized = item.status === "hospitalized";
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl font-black text-xs ${
                      isPresent
                        ? "bg-[#DCFCE7] text-[#16A34A]"
                        : isHospitalized
                        ? "bg-[#FFE4E6] text-[#E11D48]"
                        : "bg-[#FEF3C7] text-[#D97706]"
                    }`}
                  >
                    {item.residentName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#17133A]">
                      {item.residentName}
                    </h3>
                    <p className="text-[11px] text-[#686581]">
                      {item.roomNumber || "Unassigned"} • Marked {item.recordedAt ? "08:15 AM" : "Pending"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={isPresent ? "success" : isHospitalized ? "danger" : "warning"}
                    className="capitalize text-[10px]"
                  >
                    {item.status}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => toggleStatus(item.id, item.status)}
                    className={`h-8 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                      isPresent
                        ? "bg-[#F3E8FF] border-[#6D28D9]/30 text-[#6D28D9]"
                        : "bg-[#FAF8FF] border-[#E8E1F5] text-[#686581]"
                    }`}
                  >
                    {isPresent ? "Present ✓" : "Mark Present"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
