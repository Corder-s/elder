"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDevResetToken(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to send reset instructions.");
        return;
      }
      if (data.devResetToken) {
        setDevResetToken(data.devResetToken);
      }
      setIsSubmitted(true);
    } catch {
      setError("Network error while requesting password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between px-6 py-6 max-w-md mx-auto select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/login"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-[#E8E1F5] text-[#17133A] hover:bg-[#F3E8FF] transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-3 py-1 rounded-full">
          Security
        </span>
      </div>

      {/* Main Content Container */}
      <div className="my-auto space-y-6 pt-2">
        <div className="flex flex-col items-center text-center">
          <Logo size="md" showText={false} className="mb-3" />
          <h2 className="text-2xl font-black text-[#17133A]">
            Reset Password
          </h2>
          <p className="text-xs text-[#686581] mt-1.5 max-w-xs">
            Enter your registered staff email address to receive password recovery instructions.
          </p>
        </div>

        {isSubmitted ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] shadow-card text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#16A34A] shadow-soft">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17133A]">
                Check Your Inbox
              </h3>
              <p className="text-xs text-[#686581] mt-1 leading-relaxed">
                If an authorized account is linked with <strong className="text-[#17133A] font-semibold">{email}</strong>, a secure reset token has been dispatched.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              {devResetToken && (
                <div className="p-3 rounded-2xl bg-[#F3E8FF] border border-[#DDD6FE] text-xs text-[#4C1D95] space-y-2 mb-2">
                  <p className="font-semibold">
                    SMTP email is not configured on this local server. Reset your password directly:
                  </p>
                  <Link href={`/reset-password?token=${encodeURIComponent(devResetToken)}`} className="block">
                    <Button className="w-full bg-[#6D28D9] text-white h-10 rounded-2xl font-bold text-xs">
                      Reset Password Now →
                    </Button>
                  </Link>
                </div>
              )}
              <Link href={devResetToken ? `/reset-password?token=${encodeURIComponent(devResetToken)}` : "/reset-password"}>
                <Button className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white h-11 rounded-2xl font-bold flex items-center justify-center gap-2">
                  <span>Enter Reset Token</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="block">
                <button
                  type="button"
                  className="w-full h-10 rounded-2xl border border-[#E8E1F5] bg-[#FAF8FF] text-xs font-bold text-[#686581] hover:text-[#17133A]"
                >
                  Return to Sign In
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-[#FFE4E6] text-[#E11D48] text-xs font-semibold">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#17133A] flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#6D28D9]" />
                <span>Registered Email</span>
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@sriseva-ashram.org"
                className="h-11 rounded-2xl border-[#E8E1F5] bg-[#FAF8FF] text-xs focus:ring-[#6D28D9]"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white h-11 rounded-2xl font-bold text-sm shadow-soft transition-all"
            >
              {isLoading ? "Sending Link..." : "Send Reset Link"}
            </Button>
          </form>
        )}

        <div className="p-3.5 rounded-2xl bg-[#F3E8FF]/60 border border-[#E8E1F5] flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-[#6D28D9] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#686581] leading-tight">
            Accounts require active administrative status. For immediate access assistance, contact the Ashram Helpdesk.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <Link
          href="/login"
          className="text-xs font-bold text-[#6D28D9] hover:underline"
        >
          Remember your password? Sign In
        </Link>
      </div>
    </div>
  );
}
