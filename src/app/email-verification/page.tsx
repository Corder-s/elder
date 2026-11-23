"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, CheckCircle2, RotateCw, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export default function EmailVerificationPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between px-6 py-6 max-w-md mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/register"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-[#E8E1F5] text-[#17133A] hover:bg-[#F3E8FF] transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-3 py-1 rounded-full">
          Verification
        </span>
      </div>

      {/* Main Content */}
      <div className="my-auto space-y-6 pt-2">
        <div className="flex flex-col items-center text-center">
          <Logo size="md" showText={false} className="mb-3" />
          <h2 className="text-2xl font-black text-[#17133A]">
            Verify Your Email
          </h2>
          <p className="text-xs text-[#686581] mt-1.5 max-w-xs">
            We sent a 6-digit confirmation code to your organizational email.
          </p>
        </div>

        {isVerified ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] shadow-card text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#16A34A] shadow-soft">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17133A]">
                Email Verified Successfully!
              </h3>
              <p className="text-xs text-[#686581] mt-1 leading-relaxed">
                Your email identity is confirmed. Now proceed to select your operational role.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => router.push("/role-selection")}
                className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white h-11 rounded-2xl font-bold"
              >
                Proceed to Role Selection
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-5 text-center">
            <div className="flex items-center justify-center gap-2">
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  id={`digit-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  className="h-12 w-11 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] text-center text-lg font-black text-[#17133A] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                />
              ))}
            </div>

            <Button
              onClick={handleVerify}
              disabled={isVerifying || code.some((d) => !d)}
              className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white h-11 rounded-2xl font-bold text-sm shadow-soft transition-all"
            >
              {isVerifying ? "Verifying Code..." : "Confirm & Continue"}
            </Button>

            <button
              type="button"
              className="text-xs font-bold text-[#6D28D9] inline-flex items-center gap-1.5 hover:underline"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Resend Verification Code</span>
            </button>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-[#F3E8FF]/60 border border-[#E8E1F5] flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-[#6D28D9] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#686581] leading-tight">
            Security policy: Accounts must possess a verified domain to proceed to NGO operational roles.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <Link href="/login" className="text-xs font-bold text-[#6D28D9] hover:underline">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}
