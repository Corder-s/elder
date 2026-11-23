"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, KeyRound } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between px-6 py-6 max-w-md mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/forgot-password"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-[#E8E1F5] text-[#17133A] hover:bg-[#F3E8FF] transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-3 py-1 rounded-full">
          New Credentials
        </span>
      </div>

      {/* Main Content */}
      <div className="my-auto space-y-6 pt-2">
        <div className="flex flex-col items-center text-center">
          <Logo size="md" showText={false} className="mb-3" />
          <h2 className="text-2xl font-black text-[#17133A]">
            Set New Password
          </h2>
          <p className="text-xs text-[#686581] mt-1.5 max-w-xs">
            Create a strong new password to regain access to ElderCare OS.
          </p>
        </div>

        {isSuccess ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] shadow-card text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#16A34A] shadow-soft">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17133A]">
                Password Updated!
              </h3>
              <p className="text-xs text-[#686581] mt-1 leading-relaxed">
                Your password has been reset securely. You can now log in with your updated credentials.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white h-11 rounded-2xl font-bold"
              >
                Sign In Now
              </Button>
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
                <KeyRound className="h-3.5 w-3.5 text-[#6D28D9]" />
                <span>Reset Token / Verification Code</span>
              </label>
              <Input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="6-digit code or token"
                className="h-11 rounded-2xl border-[#E8E1F5] bg-[#FAF8FF] text-xs focus:ring-[#6D28D9]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#17133A] flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#6D28D9]" />
                <span>New Password</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-11 rounded-2xl border-[#E8E1F5] bg-[#FAF8FF] text-xs pr-10 focus:ring-[#6D28D9]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#686581] hover:text-[#17133A]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#17133A] flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#6D28D9]" />
                <span>Confirm New Password</span>
              </label>
              <Input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="h-11 rounded-2xl border-[#E8E1F5] bg-[#FAF8FF] text-xs focus:ring-[#6D28D9]"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !token || !password || !confirmPassword}
              className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white h-11 rounded-2xl font-bold text-sm shadow-soft transition-all"
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        )}
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
