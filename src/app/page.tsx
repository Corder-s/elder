"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AdministratorDashboard } from "@/components/dashboards/AdministratorDashboard";
import { DoctorDashboard } from "@/components/dashboards/DoctorDashboard";
import { CaretakerDashboard } from "@/components/dashboards/CaretakerDashboard";
import { AccountantDashboard } from "@/components/dashboards/AccountantDashboard";
import { StaffDashboard } from "@/components/dashboards/StaffDashboard";
import { VolunteerDashboard } from "@/components/dashboards/VolunteerDashboard";
import { FamilyDashboard } from "@/components/dashboards/FamilyDashboard";
import { Building2, Shield } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isPlatformAdmin,
    isLoading,
    currentRole,
    activeOrgId,
    activeOrgName,
    memberships,
    switchWorkspace,
  } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (isPlatformAdmin) {
      router.replace("/platform/overview");
      return;
    }
    if (!activeOrgId) {
      router.replace("/pending-approval");
    }
  }, [isLoading, isAuthenticated, isPlatformAdmin, activeOrgId, router]);

  if (isLoading || !isAuthenticated || isPlatformAdmin || !activeOrgId) {
    return (
      <div className="min-h-screen bg-[#FAF8FF] flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-3 animate-pulse">
          <div className="h-10 rounded-2xl bg-[#E8E1F5]" />
          <div className="h-32 rounded-3xl bg-white border border-[#E8E1F5]" />
          <div className="h-48 rounded-3xl bg-white border border-[#E8E1F5]" />
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (currentRole) {
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
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white border border-[#E8E1F5] text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="h-3.5 w-3.5 text-[#6D28D9] shrink-0" />
            <span className="font-bold text-[#17133A] truncate">
              {activeOrgName || user?.displayName}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#6D28D9] text-[10px] font-bold uppercase">
              {currentRole.replace("_", " ")}
            </span>
          </div>

          {memberships.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#686581]" />
              <select
                value={activeOrgId}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="text-[11px] font-bold text-[#6D28D9] bg-transparent focus:outline-none"
              >
                {memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId}>
                    {m.organizationName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {renderDashboard()}
      </div>
    </AppShell>
  );
}
