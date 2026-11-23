"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Building2,
  Stethoscope,
  HeartPulse,
  IndianRupee,
  Briefcase,
  Sparkles,
  Users,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { RoleType } from "@/types";

interface RoleOption {
  id: RoleType;
  title: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  responsibilities: string[];
  requiresApproval: boolean;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "super_admin",
    title: "Super Admin",
    badge: "Platform Owner",
    icon: ShieldAlert,
    description: "Complete platform, multi-branch, and system configuration control.",
    responsibilities: ["Manage branches & settings", "Audit logs & user control", "Role permission assignments"],
    requiresApproval: true,
  },
  {
    id: "ngo_admin",
    title: "Administrator",
    badge: "Operations Head",
    icon: Building2,
    description: "Daily NGO and old-age-home operations, admissions, and rescue intake.",
    responsibilities: ["Resident profiles & room allocation", "Rescue cases & admissions", "Staff management & reports"],
    requiresApproval: true,
  },
  {
    id: "doctor",
    title: "Doctor / Medical Officer",
    badge: "Clinical Care",
    icon: Stethoscope,
    description: "Medical records, doctor consultations, prescriptions, and health diagnoses.",
    responsibilities: ["Verify prescriptions", "Health observations & vitals", "Hospital referral summaries"],
    requiresApproval: true,
  },
  {
    id: "nurse",
    title: "Caretaker / Nurse",
    badge: "Daily Resident Care",
    icon: HeartPulse,
    description: "Daily resident care, vitals observation, and medicine administration.",
    responsibilities: ["Log medicine administration", "Record daily attendance", "Shift diary & vital checks"],
    requiresApproval: true,
  },
  {
    id: "accountant",
    title: "Accountant",
    badge: "Finance & Accounts",
    icon: IndianRupee,
    description: "Donations, operational expenses, sequential receipt generation, and audits.",
    responsibilities: ["Record donor contributions", "Issue sequential receipts", "Expense & tax reports"],
    requiresApproval: true,
  },
  {
    id: "staff",
    title: "Operational Staff",
    badge: "Operations",
    icon: Briefcase,
    description: "Assigned daily responsibilities, meals distribution, and logistics.",
    responsibilities: ["View assigned daily duties", "Log duty attendance", "Maintenance tasks"],
    requiresApproval: true,
  },
  {
    id: "volunteer",
    title: "Volunteer",
    badge: "Community Support",
    icon: Sparkles,
    description: "Assigned activities, cultural events, bhajan sessions, and elder engagement.",
    responsibilities: ["Participate in events", "Log volunteer hours", "Submit activity updates"],
    requiresApproval: true,
  },
  {
    id: "family_guardian",
    title: "Family Member / Guardian",
    badge: "Loved One Updates",
    icon: Users,
    description: "Access to your linked resident's permitted health updates and visits.",
    responsibilities: ["View loved one's wellness", "Book approved visit slots", "View medication updates"],
    requiresApproval: true,
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const { submitRoleRequest, user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleType>("ngo_admin");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentOption = ROLE_OPTIONS.find((r) => r.id === selectedRole) || ROLE_OPTIONS[1];

  const handleConfirmRole = () => {
    setIsSubmitting(true);
    submitRoleRequest(selectedRole, "Sri Seva Old Age Home");
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/pending-approval");
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] px-4 py-8 max-w-lg mx-auto select-none space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-3 py-1 rounded-full">
          Step 2 of 2: Role Access
        </span>
        <h1 className="text-2xl font-black text-[#17133A] tracking-tight">
          Which role best describes you?
        </h1>
        <p className="text-xs text-[#686581] max-w-sm mx-auto leading-relaxed">
          Choose the role that matches your responsibilities at the old age home. Your access will be reviewed before activation.
        </p>
      </div>

      {/* Role Cards List */}
      <div className="space-y-3">
        {ROLE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedRole === option.id;

          return (
            <div
              key={option.id}
              onClick={() => setSelectedRole(option.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                isSelected
                  ? "bg-white border-[#6D28D9] shadow-soft ring-2 ring-[#6D28D9]/20"
                  : "bg-white border-[#E8E1F5] hover:border-[#8B5CF6]/40 shadow-2xs"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] text-white shadow-md shadow-purple-900/20"
                      : "bg-[#F3E8FF] text-[#6D28D9]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-[#17133A]">
                      {option.title}
                    </h3>
                    <span className="text-[10px] font-semibold text-[#6D28D9] bg-[#F3E8FF] px-2 py-0.5 rounded-full shrink-0">
                      {option.badge}
                    </span>
                  </div>

                  <p className="text-xs text-[#686581] mt-1 leading-relaxed">
                    {option.description}
                  </p>

                  {/* Highlights when selected */}
                  {isSelected && (
                    <div className="mt-3 pt-2.5 border-t border-[#F3E8FF] space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6D28D9] block">
                        Permitted Responsibilities:
                      </span>
                      {option.responsibilities.map((resp, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#17133A]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A] shrink-0" />
                          <span>{resp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Rule Callout */}
      <div className="p-3.5 rounded-2xl bg-[#F3E8FF]/60 border border-[#E8E1F5] flex items-start gap-2.5 text-xs text-[#4C1D95]">
        <Lock className="h-4 w-4 text-[#6D28D9] shrink-0 mt-0.5" />
        <span className="text-[11px] leading-relaxed">
          <strong>Strict Security Safeguard:</strong> Selecting a role submits an authorization request to the NGO Super Admin. Privileged access is never granted automatically without verified administrative sign-off.
        </span>
      </div>

      {/* Bottom Sticky Action */}
      <div className="sticky bottom-4 pt-2">
        <Button
          onClick={handleConfirmRole}
          size="lg"
          disabled={isSubmitting}
          className="w-full rounded-2xl font-bold text-sm shadow-floating"
        >
          {isSubmitting ? "Submitting Access Request..." : `Continue with ${currentOption.title}`}
        </Button>
      </div>
    </div>
  );
}
