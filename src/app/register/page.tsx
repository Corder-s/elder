"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Phone, Lock, Building2, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    orgName: "Sri Seva Old Age Home",
    agreeTerms: true,
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    // Register user in pending state
    register({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      orgName: form.orgName,
    });
    // Redirect to Role Selection
    router.push("/role-selection");
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between px-6 py-6 max-w-md mx-auto select-none">
      <div className="flex items-center justify-between">
        <Link
          href="/login"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-[#E8E1F5] text-[#17133A] hover:bg-[#F3E8FF] transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-3 py-1 rounded-full">
          Step 1 of 2
        </span>
      </div>

      <div className="my-auto space-y-5 pt-4">
        <div>
          <h2 className="text-2xl font-black text-[#17133A]">
            Create Account
          </h2>
          <p className="text-xs text-[#686581] mt-1">
            Join your old age home team on ElderCare OS
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3.5">
          {/* Full Name */}
          <div className="relative flex items-center">
            <User className="absolute left-3.5 h-4 w-4 text-[#686581] pointer-events-none" />
            <input
              type="text"
              required
              placeholder="Full Name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs font-medium text-[#17133A] placeholder:text-[#686581]/70 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] shadow-2xs"
            />
          </div>

          {/* Email */}
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 h-4 w-4 text-[#686581] pointer-events-none" />
            <input
              type="email"
              required
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs font-medium text-[#17133A] placeholder:text-[#686581]/70 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] shadow-2xs"
            />
          </div>

          {/* Mobile Phone */}
          <div className="relative flex items-center">
            <Phone className="absolute left-3.5 h-4 w-4 text-[#686581] pointer-events-none" />
            <input
              type="tel"
              required
              placeholder="Mobile Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs font-medium text-[#17133A] placeholder:text-[#686581]/70 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] shadow-2xs"
            />
          </div>

          {/* Organization Name */}
          <div className="relative flex items-center">
            <Building2 className="absolute left-3.5 h-4 w-4 text-[#686581] pointer-events-none" />
            <input
              type="text"
              required
              placeholder="Organization / Old Age Home Name"
              value={form.orgName}
              onChange={(e) => setForm({ ...form, orgName: e.target.value })}
              className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs font-medium text-[#17133A] placeholder:text-[#686581]/70 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] shadow-2xs"
            />
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-3.5 w-3.5 text-[#686581] pointer-events-none" />
              <input
                type="password"
                required
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-9 pr-3 text-xs font-medium text-[#17133A] placeholder:text-[#686581]/70 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] shadow-2xs"
              />
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-3.5 w-3.5 text-[#686581] pointer-events-none" />
              <input
                type="password"
                required
                placeholder="Confirm"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-9 pr-3 text-xs font-medium text-[#17133A] placeholder:text-[#686581]/70 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] shadow-2xs"
              />
            </div>
          </div>

          {/* Terms checkbox */}
          <label className="flex items-start gap-2.5 pt-1 text-xs text-[#686581] cursor-pointer">
            <input
              type="checkbox"
              required
              checked={form.agreeTerms}
              onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded-md border-[#E8E1F5] text-[#6D28D9] focus:ring-[#6D28D9]"
            />
            <span className="leading-tight text-[11px]">
              I agree to the <strong>Terms of Service</strong> and <strong>Elderly Healthcare Privacy Policy</strong>.
            </span>
          </label>

          <Button type="submit" size="lg" className="w-full rounded-2xl font-bold shadow-md shadow-purple-900/20">
            Continue to Role Selection
          </Button>
        </form>

        <div className="text-center text-xs text-[#686581] pt-1">
          <span>Already have an account? </span>
          <Link href="/login" className="font-bold text-[#6D28D9] hover:underline">
            Sign In
          </Link>
        </div>
      </div>

      <div className="text-center text-[10px] text-[#686581]/70 pt-4">
        ElderCare OS • Secure Healthcare Registration
      </div>
    </div>
  );
}
