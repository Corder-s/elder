"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Shield,
  Phone,
  Mail,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { dataService } from "@/services/mockDataService";
import { User, RoleType } from "@/types";

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    dataService.getUsers().then(setUsers);
  }, []);

  const roleLabels: Record<RoleType, string> = {
    super_admin: "Super Admin",
    ngo_admin: "Administrator",
    doctor: "Doctor",
    nurse: "Caretaker / Nurse",
    accountant: "Accountant",
    staff: "Staff Member",
    volunteer: "Volunteer",
    family_guardian: "Family Member",
    auditor: "Auditor",
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = roleFilter === "all" || u.role === roleFilter;
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
              <h1 className="text-lg font-black text-[#17133A]">Staff & Volunteers</h1>
              <p className="text-[11px] text-[#686581]">Directory & role access control</p>
            </div>
          </div>
          <Badge variant="purple" className="px-2.5 py-1">
            {users.length} Team Members
          </Badge>
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name, role, or email..."
          icon={<Search className="h-4 w-4 text-[#686581]" />}
          className="h-11 rounded-2xl bg-white border-[#E8E1F5] text-xs"
        />

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {["all", "ngo_admin", "doctor", "nurse", "staff", "volunteer"].map((rf) => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                roleFilter === rf
                  ? "bg-[#6D28D9] text-white shadow-soft"
                  : "bg-white text-[#686581] border border-[#E8E1F5]"
              }`}
            >
              {rf === "all"
                ? "All Staff"
                : rf === "ngo_admin"
                ? "Admins"
                : rf === "doctor"
                ? "Doctors"
                : rf === "nurse"
                ? "Caretakers"
                : rf.charAt(0).toUpperCase() + rf.slice(1)}
            </button>
          ))}
        </div>

        {/* Staff Cards */}
        <div className="space-y-3">
          {filtered.map((user) => {
            const isActive = user.status === "active";
            return (
              <div
                key={user.id}
                className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] text-white font-black text-sm shadow-soft">
                      {user.displayName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#17133A]">
                        {user.displayName}
                      </h3>
                      <p className="text-[11px] font-semibold text-[#6D28D9]">
                        {roleLabels[user.role] || user.role}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={isActive ? "success" : "warning"}
                    className="text-[10px] uppercase font-bold"
                  >
                    {user.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E8E1F5]/60">
                  <div className="p-2.5 rounded-xl bg-[#FAF8FF]">
                    <span className="text-[10px] text-[#686581] block">Branch</span>
                    <span className="font-bold text-[#17133A] text-[11px]">
                      Sri Seva Ashram
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8FF]">
                    <span className="text-[10px] text-[#686581] block">Duty Status</span>
                    <span className="font-bold text-[#16A34A] text-[11px] flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]"></span>
                      <span>On-Duty</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-[#686581]">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#6D28D9]" />
                    <span>{user.email}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-[#686581]" />
                    <span>{user.phone || "+91 98112 00000"}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
