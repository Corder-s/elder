"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between px-6 py-6 max-w-md mx-auto select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-[#E8E1F5] text-[#17133A] hover:bg-[#F3E8FF] transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-[11px] font-bold text-[#E11D48] uppercase tracking-wider bg-[#FFE4E6] px-3 py-1 rounded-full">
          Access Restricted
        </span>
      </div>

      {/* Main Container */}
      <div className="my-auto space-y-6 pt-2 text-center">
        <div className="flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FFE4E6] text-[#E11D48] shadow-card mb-4">
            <Lock className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-[#17133A]">
            Access Denied
          </h2>
          <p className="text-xs text-[#686581] mt-2 max-w-xs leading-relaxed">
            Your current account role does not have authorization to view this protected healthcare module or administrative record.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E8E1F5] shadow-card text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#17133A]">
            <ShieldAlert className="h-4 w-4 text-[#E11D48]" />
            <span>Role-Based Access Enforcement</span>
          </div>
          <p className="text-[11px] text-[#686581] leading-relaxed">
            Medical history, resident admissions, and financial disbursements are safeguarded in compliance with healthcare data protection standards.
          </p>
          <div className="pt-2">
            <p className="text-[11px] text-[#686581]">
              Need access? Contact your Organization Administrator or Head of Ashram to update role permissions.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Link href="/">
            <Button className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white h-11 rounded-2xl font-bold flex items-center justify-center gap-2">
              <Home className="h-4 w-4" />
              <span>Return to Dashboard</span>
            </Button>
          </Link>
          <Link href="/login" className="block">
            <button
              type="button"
              className="w-full h-10 rounded-2xl border border-[#E8E1F5] bg-white text-xs font-bold text-[#686581] hover:text-[#17133A]"
            >
              Switch Account
            </button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-[11px] text-[#686581]">
          ElderCare OS Security Infrastructure
        </p>
      </div>
    </div>
  );
}
