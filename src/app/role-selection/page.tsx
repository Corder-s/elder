"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, LogOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function WorkspaceSelectorPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated, isPlatformAdmin, memberships, activeOrgId, switchWorkspace, logout } = useAuth();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (memberships.length === 0) {
      router.replace("/pending-approval");
    }
  }, [isLoading, isAuthenticated, isPlatformAdmin, memberships.length, router]);

  const handleSelectWorkspace = async (orgId: string) => {
    setError(null);
    setSwitchingId(orgId);
    const ok = await switchWorkspace(orgId);
    setSwitchingId(null);
    if (!ok) {
      setError("Unable to enter selected workspace. Your membership may have been suspended.");
      return;
    }
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] px-6 py-10 max-w-md mx-auto flex flex-col justify-between">
      <div className="my-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-3 py-1 rounded-full">
            Authorized Workspaces
          </span>
          <h1 className="text-2xl font-black text-[#17133A]">Select Organization</h1>
          <p className="text-xs text-[#686581]">
            Choose an organization workspace from your server-verified memberships.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-[#FFE4E6] text-[#E11D48] text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {memberships.map((m) => (
            <button
              key={m.organizationId}
              disabled={switchingId === m.organizationId}
              onClick={() => handleSelectWorkspace(m.organizationId)}
              className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                activeOrgId === m.organizationId
                  ? "bg-[#F3E8FF] border-[#6D28D9]"
                  : "bg-white border-[#E8E1F5] hover:border-[#6D28D9]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#17133A]">{m.organizationName}</p>
                  <p className="text-[11px] text-[#686581]">
                    Role: <span className="font-semibold text-[#6D28D9]">{m.roleName}</span>
                  </p>
                </div>
              </div>
              {switchingId === m.organizationId ? (
                <span className="text-xs font-bold text-[#6D28D9]">Opening...</span>
              ) : activeOrgId === m.organizationId ? (
                <CheckCircle2 className="h-5 w-5 text-[#6D28D9]" />
              ) : (
                <ArrowRight className="h-4 w-4 text-[#686581]" />
              )}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => logout()}
          className="w-full rounded-2xl text-xs font-bold text-[#E11D48] flex items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
