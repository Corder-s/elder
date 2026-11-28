"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, RotateCw, ShieldCheck, KeyRound, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function EmailVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed.");
        return;
      }
      setIsVerified(true);
    } catch {
      setError("Network error while verifying email.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to resend verification email.");
        return;
      }
      if (data.devVerificationToken) {
        setToken(data.devVerificationToken);
        setInfoMessage("SMTP is not configured on this server. Your verification token has been filled below — tap Verify Email Address.");
      } else {
        setInfoMessage(data.message || "Verification link dispatched if account is eligible.");
      }
      setShowResend(false);
    } catch {
      setError("Network error while resending verification.");
    } finally {
      setIsResending(false);
    }
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
            Enter the one-time verification token sent to your organizational email.
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
                Your email identity is confirmed. You can now sign in to your workspace.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white h-11 rounded-2xl font-bold"
              >
                Sign In to Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-[#FFE4E6] text-[#E11D48] text-xs font-semibold">
                {error}
              </div>
            )}
            {infoMessage && (
              <div className="p-3 rounded-xl bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold">
                {infoMessage}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#17133A] flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-[#6D28D9]" />
                  <span>Verification Token</span>
                </label>
                <Input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste verification token"
                  className="h-11 rounded-2xl border-[#E8E1F5] bg-[#FAF8FF] text-xs focus:ring-[#6D28D9]"
                />
              </div>

              <Button
                type="submit"
                disabled={isVerifying || !token}
                className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white h-11 rounded-2xl font-bold text-sm shadow-soft transition-all"
              >
                {isVerifying ? "Verifying Token..." : "Confirm & Verify"}
              </Button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowResend(!showResend)}
                className="text-xs font-bold text-[#6D28D9] inline-flex items-center gap-1.5 hover:underline"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Resend Verification Email</span>
              </button>
            </div>

            {showResend && (
              <form onSubmit={handleResend} className="pt-3 border-t border-[#E8E1F5] space-y-2.5">
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 h-3.5 w-3.5 text-[#686581]" />
                  <Input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="h-10 pl-9 rounded-xl border-[#E8E1F5] bg-[#FAF8FF] text-xs"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isResending || !resendEmail}
                  className="w-full h-9 rounded-xl bg-[#F3E8FF] text-[#6D28D9] hover:bg-[#E8E1F5] text-xs font-bold"
                >
                  {isResending ? "Sending..." : "Send Verification Link"}
                </Button>
              </form>
            )}
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-[#F3E8FF]/60 border border-[#E8E1F5] flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-[#6D28D9] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#686581] leading-tight">
            Security policy: Accounts must possess a verified email address to sign in to NGO operational roles.
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

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8FF]" />}>
      <EmailVerificationContent />
    </Suspense>
  );
}
