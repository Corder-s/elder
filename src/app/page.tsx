"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { RoleType } from "@/types";
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard";
import { AdministratorDashboard } from "@/components/dashboards/AdministratorDashboard";
import { DoctorDashboard } from "@/components/dashboards/DoctorDashboard";
import { CaretakerDashboard } from "@/components/dashboards/CaretakerDashboard";
import { AccountantDashboard } from "@/components/dashboards/AccountantDashboard";
import { StaffDashboard } from "@/components/dashboards/StaffDashboard";
import { VolunteerDashboard } from "@/components/dashboards/VolunteerDashboard";
import { FamilyDashboard } from "@/components/dashboards/FamilyDashboard";
import { Shield } from "lucide-react";

export default function HomePage() {
  const { currentRole, switchRole, availableRoles } = useAuth();

  const renderDashboard = () => {
    switch (currentRole) {
      case "super_admin":
        return <SuperAdminDashboard />;
      case "doctor":
        return <DoctorDashboard />;
      case "nurse":
        return <CaretakerDashboard />;
      case "accountant":
        return <AccountantDashboard />;
      case "staff":
        return <StaffDashboard />;
      case "volunteer":
        return <VolunteerDashboard />;
      case "family_guardian":
        return <FamilyDashboard />;
      case "ngo_admin":
      default:
        return <AdministratorDashboard />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Interactive Role Switcher Carousel matching Reference 1 (Allows instant evaluation of all 8 roles) */}
        <div className="pb-1 overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="flex items-center gap-1.5 w-max">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#686581] mr-1 flex items-center gap-1">
              <Shield className="h-3 w-3 text-[#6D28D9]" />
              <span>Role:</span>
            </span>

            {availableRoles.map((role) => {
              const isSelected = currentRole === role;
              const labelMap: Record<RoleType, string> = {
                super_admin: "Super Admin",
                ngo_admin: "Administrator",
                doctor: "Doctor",
                nurse: "Caretaker / Nurse",
                accountant: "Accountant",
                staff: "Staff",
                volunteer: "Volunteer",
                family_guardian: "Family Member",
                auditor: "Auditor",
              };

              return (
                <button
                  key={role}
                  onClick={() => switchRole(role)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    isSelected
                      ? "bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-soft"
                      : "bg-white text-[#686581] border border-[#E8E1F5] hover:border-[#6D28D9]/40 hover:text-[#17133A]"
                  }`}
                >
                  {labelMap[role]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Role Dashboard */}
        {renderDashboard()}
      </div>
    </AppShell>
  );
}
