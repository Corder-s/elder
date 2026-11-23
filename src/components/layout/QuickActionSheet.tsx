"use client";

import React from "react";
import Link from "next/link";
import {
  X,
  UserPlus,
  Ambulance,
  UserCheck,
  Stethoscope,
  Pill,
  ClipboardCheck,
  Upload,
  IndianRupee,
  Calendar,
  HeartHandshake,
  CheckSquare,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import { RoleType } from "@/types";

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickActionSheet({ isOpen, onClose }: QuickActionSheetProps) {
  const { currentRole } = useAuth();

  const getRoleActions = (role: RoleType) => {
    switch (role) {
      case "super_admin":
        return [
          { label: "Manage Branches", href: "/settings", icon: UserPlus, color: "bg-purple-100 text-[#6D28D9]" },
          { label: "Manage Users", href: "/settings", icon: UserCheck, color: "bg-blue-100 text-blue-700" },
          { label: "Audit Logs", href: "/settings", icon: ClipboardCheck, color: "bg-amber-100 text-amber-700" },
          { label: "View Reports", href: "/reports", icon: CheckSquare, color: "bg-emerald-100 text-emerald-700" },
        ];
      case "doctor":
        return [
          { label: "Record Vitals", href: "/medical-records", icon: Stethoscope, color: "bg-blue-100 text-blue-700" },
          { label: "Verify Prescription", href: "/medicines", icon: Pill, color: "bg-purple-100 text-[#6D28D9]" },
          { label: "Schedule Checkup", href: "/events", icon: Calendar, color: "bg-emerald-100 text-emerald-700" },
          { label: "Medical Report", href: "/reports", icon: ClipboardCheck, color: "bg-amber-100 text-amber-700" },
        ];
      case "nurse":
        return [
          { label: "Record Medicine", href: "/medicines", icon: Pill, color: "bg-purple-100 text-[#6D28D9]" },
          { label: "Mark Attendance", href: "/attendance", icon: ClipboardCheck, color: "bg-emerald-100 text-emerald-700" },
          { label: "Log Vitals", href: "/medical-records", icon: Stethoscope, color: "bg-blue-100 text-blue-700" },
          { label: "Daily Diary", href: "/diary", icon: CheckSquare, color: "bg-amber-100 text-amber-700" },
        ];
      case "accountant":
        return [
          { label: "Add Donation", href: "/finance", icon: IndianRupee, color: "bg-emerald-100 text-emerald-700" },
          { label: "Record Expense", href: "/finance", icon: ClipboardCheck, color: "bg-rose-100 text-rose-700" },
          { label: "Generate Receipt", href: "/finance", icon: UserCheck, color: "bg-purple-100 text-[#6D28D9]" },
          { label: "Financial Report", href: "/reports", icon: CheckSquare, color: "bg-blue-100 text-blue-700" },
        ];
      case "family_guardian":
        return [
          { label: "Book Visit Slot", href: "/visitors", icon: Calendar, color: "bg-purple-100 text-[#6D28D9]" },
          { label: "View Health Records", href: "/medical-records", icon: Stethoscope, color: "bg-blue-100 text-blue-700" },
          { label: "View Medicines", href: "/medicines", icon: Pill, color: "bg-emerald-100 text-emerald-700" },
          { label: "Contact Ashram Desk", href: "/residents", icon: HeartHandshake, color: "bg-amber-100 text-amber-700" },
        ];
      case "ngo_admin":
      default:
        return [
          { label: "Add Resident", href: "/residents", icon: UserPlus, color: "bg-blue-100 text-blue-700" },
          { label: "New Rescue", href: "/rescue-cases", icon: Ambulance, color: "bg-rose-100 text-rose-700" },
          { label: "New Admission", href: "/admissions", icon: UserCheck, color: "bg-purple-100 text-[#6D28D9]" },
          { label: "Medical Entry", href: "/medical-records", icon: Stethoscope, color: "bg-sky-100 text-sky-700" },
          { label: "Add Visitor", href: "/visitors", icon: Calendar, color: "bg-amber-100 text-amber-700" },
          { label: "Upload Document", href: "/documents", icon: Upload, color: "bg-emerald-100 text-emerald-700" },
        ];
    }
  };

  const actions = getRoleActions(currentRole);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-sm p-5 text-center">
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E1F5] mb-4">
        <div className="text-left">
          <h3 className="text-base font-bold text-[#17133A] dark:text-[#FAF8FF]">
            Quick Actions
          </h3>
          <p className="text-[11px] text-[#686581]">
            Authorized actions for {currentRole.replace("_", " ")}
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full bg-[#FAF8FF] flex items-center justify-center text-[#686581] hover:bg-[#F3E8FF]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.label}
              href={act.href}
              onClick={onClose}
              className="p-3.5 rounded-2xl border border-[#E8E1F5] bg-[#FAF8FF] hover:bg-white hover:border-[#6D28D9]/40 flex flex-col items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-soft"
            >
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${act.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-[#17133A] dark:text-[#FAF8FF]">
                {act.label}
              </span>
            </Link>
          );
        })}
      </div>
    </Modal>
  );
}
