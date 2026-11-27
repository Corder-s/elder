"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { RoleType } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType>("ngo_admin");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresVerification) {
          setNeedsVerification(true);
        }
        setError(data.error || "Invalid email or password");
        return;
      }
      await refreshSession();
      if (data.user?.isPlatformAdmin) {
        router.push(data.mfaRequired || data.mfaSetupRequired ? "/platform/mfa" : "/platform/dashboard");
      } else {
        router.push("/");
      }
    } catch {
      setError("Unable to reach authentication server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError("Google SSO is not enabled for this workspace. Please sign in with your email and password.");
  };

  const handleMicrosoftSignIn = () => {
    setError("Microsoft SSO is not enabled for this workspace. Please sign in with your email and password.");
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between px-6 py-6 max-w-md mx-auto select-none relative overflow-hidden">
      {/* Background Soft Purple Wavy Accents matching Reference Screen 2 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#F3E8FF] to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-70" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#F3E8FF] to-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-20 opacity-70" />

      {/* Top Left Back Navigation Arrow matching Reference Screen 2 */}
      <div className="relative z-10 flex items-center justify-between">
        <Link
          href="/welcome"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-[#E8E1F5] text-[#17133A] hover:bg-[#F3E8FF] transition-colors shadow-2xs"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-3 py-1 rounded-full">
          Secure Login
        </span>
      </div>

      {/* Main Login Form Container */}
      <div className="relative z-10 my-auto space-y-5 pt-3">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" showText={true} className="mb-3" />
          <h2 className="text-2xl font-black text-[#17133A] flex items-center gap-1.5">
            <span>Welcome Back</span>
            <span className="text-xl">👋</span>
          </h2>
          <p className="text-xs text-[#686581] mt-1">
            Sign in to continue to ElderCare OS
          </p>
        </div>

        {/* Role Evaluation Selector */}
        <div className="p-3 rounded-2xl bg-white/90 backdrop-blur-xs border border-[#E8E1F5] shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>Simulate Role:</span>
            </span>
            <span className="text-[10px] text-[#686581]">8 Roles Available</span>
          </div>
          <select
            className="w-full h-9 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-2.5 text-xs font-semibold text-[#17133A] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as RoleType)}
          >
            <option value="ngo_admin">Administrator (Sri Seva Old Age Home)</option>
            <option value="super_admin">Super Admin (System Control)</option>
            <option value="doctor">Doctor (Medical Care & Prescriptions)</option>
            <option value="nurse">Caretaker / Nurse (Daily Care & Vitals)</option>
            <option value="accountant">Accountant (Finance & Donations)</option>
            <option value="staff">Staff (Assigned Activities)</option>
            <option value="volunteer">Volunteer (Support Activities)</option>
            <option value="family_guardian">Family Member (Resident Updates)</option>
          </select>
        </div>

        {/* Form Inputs matching Reference Screen 2 */}
        <form onSubmit={handleSignIn} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-2xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs font-semibold space-y-1">
              <p>{error}</p>
              {needsVerification && (
                <Link href="/email-verification" className="underline font-bold block">
                  Verify Email Address →
                </Link>
              )}
            </div>
          )}
          {/* Email */}
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 h-4 w-4 text-[#686581] pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full h-12 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs font-medium text-[#17133A] placeholder:text-[#686581]/70 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] shadow-2xs"
            />
          </div>

          {/* Password */}
          <div className="relative flex items-center">
            <Lock className="absolute left-3.5 h-4 w-4 text-[#686581] pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-12 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-11 text-xs font-medium text-[#17133A] placeholder:text-[#686581]/70 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-[#686581] hover:text-[#17133A]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Forgot Password link matching Reference Screen 2 */}
          <div className="flex justify-end pt-0.5">
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-[#6D28D9] hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Purple Sign In Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white font-bold text-sm rounded-2xl shadow-soft transition-all"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        {/* Divider: or */}
        <div className="relative flex items-center justify-center my-3">
          <div className="border-t border-[#E8E1F5] w-full" />
          <span className="bg-[#FAF8FF] px-3 text-xs font-semibold text-[#686581] relative">
            or
          </span>
          <div className="border-t border-[#E8E1F5] w-full" />
        </div>

        {/* Social SSO Buttons matching Reference Screen 2 */}
        <div className="space-y-2">
          {/* Google SSO */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white hover:bg-[#FAF8FF] transition-all flex items-center justify-center gap-2 text-xs font-bold text-[#17133A] shadow-2xs"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Microsoft SSO */}
          <button
            type="button"
            onClick={handleMicrosoftSignIn}
            className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white hover:bg-[#FAF8FF] transition-all flex items-center justify-center gap-2 text-xs font-bold text-[#17133A] shadow-2xs"
          >
            <svg className="h-4 w-4" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            <span>Continue with Microsoft</span>
          </button>
        </div>
      </div>

      {/* Footer matching Reference Screen 2 */}
      <div className="relative z-10 text-center pt-4">
        <p className="text-xs text-[#686581]">
          Don't have an account?{" "}
          <Link href="/register" className="font-bold text-[#6D28D9] hover:underline">
            Register Now
          </Link>
        </p>
      </div>
    </div>
  );
}
