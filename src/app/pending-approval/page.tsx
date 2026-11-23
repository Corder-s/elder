"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, ShieldCheck, ArrowRight, CheckCircle2, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { pendingRequest, login, user } = useAuth();

  const roleName = pendingRequest?.requestedRole?.replace("_", " ").toUpperCase() || "ADMINISTRATOR";
  const orgName = pendingRequest?.organizationName || "Sri Seva Old Age Home";

  const handleTestDemoAccess = () => {
    // Switch to active demo user for instant evaluation
    login("admin@sriseva-ashram.org", "super_admin");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between px-6 py-10 max-w-md mx-auto text-center select-none">
      <div className="my-auto space-y-6">
        {/* Animated Clock / Verification Badge */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#F3E8FF] border border-[#E8E1F5] text-[#6D28D9] shadow-soft">
          <Clock className="h-10 w-10 animate-pulse text-[#6D28D9]" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider bg-[#FEF3C7] px-3 py-1 rounded-full">
            Under Verification
          </span>
          <h1 className="text-2xl font-black text-[#17133A] tracking-tight">
            Role Request Submitted
          </h1>
          <p className="text-xs text-[#686581] max-w-xs mx-auto leading-relaxed">
            Your application for access to <strong>{orgName}</strong> is under review by the NGO Super Administrator.
          </p>
        </div>

        {/* Request Details Summary Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E1F5] shadow-card text-left text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E1F5]">
            <span className="text-[#686581]">Requested Role:</span>
            <span className="font-bold text-[#6D28D9]">{roleName}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-[#E8E1F5]">
            <span className="text-[#686581]">Organization:</span>
            <span className="font-semibold text-[#17133A]">{orgName}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-[#E8E1F5]">
            <span className="text-[#686581]">Request Status:</span>
            <span className="font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full text-[10px]">
              Pending Approval
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#686581]">Submitted:</span>
            <span className="text-[#17133A]">{new Date().toLocaleDateString("en-IN")}</span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3.5 rounded-2xl bg-[#F3E8FF]/60 border border-[#E8E1F5] text-left text-[11px] text-[#4C1D95] space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#6D28D9]" />
            <span>Healthcare Compliance Security Check</span>
          </div>
          <p className="text-[#686581] leading-relaxed">
            In compliance with patient confidentiality and DPDP standards, elderly medical profiles and rescue histories cannot be unlocked without administrator authorization.
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-2">
          {/* Quick Evaluation Demo Bypass Button */}
          <Button
            onClick={handleTestDemoAccess}
            size="lg"
            className="w-full rounded-2xl font-bold shadow-md shadow-purple-900/20"
          >
            <span>Explore Dashboard (Demo Access)</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <Link href="/login" className="block">
            <Button variant="outline" size="sm" className="w-full rounded-2xl text-xs">
              Return to Sign In
            </Button>
          </Link>
        </div>
      </div>

      <div className="text-[10px] text-[#686581]/70">
        ElderCare OS • Verification Engine
      </div>
    </div>
  );
}
