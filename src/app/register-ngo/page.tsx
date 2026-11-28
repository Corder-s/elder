"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, KeyRound, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegisterNGORedirectPage() {
  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white border border-[#E8E1F5] rounded-3xl p-8 text-center space-y-5 shadow-card">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-black text-[#17133A]">
          Organization Creation Restricted
        </h1>
        <p className="text-xs text-[#686581] leading-relaxed">
          New NGO organizations can only be provisioned by the Platform Owner. To join an existing NGO workspace, please accept your invitation or submit an access request.
        </p>
        <div className="space-y-2.5 pt-2">
          <Link href="/accept-invitation" className="block">
            <Button className="w-full rounded-2xl bg-[#6D28D9] text-white font-bold text-xs flex items-center justify-center gap-2">
              <KeyRound className="h-4 w-4" />
              Accept Organization Invitation
            </Button>
          </Link>
          <Link href="/pending-approval" className="block">
            <Button variant="outline" className="w-full rounded-2xl text-xs font-bold">
              Check Access Request Status
            </Button>
          </Link>
          <Link href="/login" className="block">
            <Button variant="ghost" className="w-full rounded-2xl text-xs font-bold text-[#686581] flex items-center justify-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              <LogIn className="h-3.5 w-3.5" />
              Return to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
