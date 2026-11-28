"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Building2,
  CheckCircle2,
  Stethoscope,
  HeartPulse,
  Briefcase,
  Sparkles,
  IndianRupee,
  Users,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PUBLIC_ACCOUNT_TYPES, type AccountTypeOption } from "@/lib/role-catalog";

const GROUP_ORDER: Array<AccountTypeOption["group"]> = [
  "A. Medical & Healthcare",
  "B. Care & Operations",
  "C. Administration",
  "D. Family",
];

function getIconForType(id: string) {
  switch (id) {
    case "doctor":
      return Stethoscope;
    case "nurse":
      return HeartPulse;
    case "ngo_admin":
    case "branch_admin":
      return ShieldCheck;
    case "accountant":
      return IndianRupee;
    case "volunteer":
      return Sparkles;
    case "family_member":
      return Users;
    default:
      return Briefcase;
  }
}

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<AccountTypeOption>(PUBLIC_ACCOUNT_TYPES[3]); // staff default
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    organizationSlug: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    accountStatus: string;
    organizationName: string | null;
    email: string;
    devVerificationToken?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          requestedAccountType: selectedType.id,
          organizationSlug: form.organizationSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      setResult({
        accountStatus: data.accountStatus || "pending_approval",
        organizationName: data.organizationName || null,
        email: form.email,
        devVerificationToken: data.devVerificationToken,
      });
      setStep(3);
    } catch {
      setError("Unable to reach registration service.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] px-5 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/login"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-[#E8E1F5] text-[#17133A] hover:bg-[#F3E8FF] transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-3 py-1 rounded-full">
          Step {step} of 3
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-black text-[#17133A]">Select Your Account Type</h1>
            <p className="text-xs text-[#686581] mt-1">
              Choose your requested role. An NGO Administrator must verify and approve your assignment before workspace permissions are granted.
            </p>
          </div>

          <div className="space-y-5">
            {GROUP_ORDER.map((groupName) => (
              <div key={groupName} className="space-y-2.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#6D28D9]">{groupName}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PUBLIC_ACCOUNT_TYPES.filter((t) => t.group === groupName).map((opt) => {
                    const Icon = getIconForType(opt.id);
                    const active = selectedType.id === opt.id;
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setSelectedType(opt)}
                        className={`p-4 rounded-3xl border text-left transition-all space-y-2 ${
                          active
                            ? "bg-[#F3E8FF] border-[#6D28D9] shadow-soft"
                            : "bg-white border-[#E8E1F5] hover:border-[#6D28D9]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-xl bg-white border border-[#E8E1F5] flex items-center justify-center text-[#6D28D9]">
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-sm font-black text-[#17133A]">{opt.name}</span>
                          </div>
                          {active && <CheckCircle2 className="h-4 w-4 text-[#6D28D9]" />}
                        </div>
                        <p className="text-[11px] text-[#686581]">{opt.shortDescription}</p>
                        <ul className="text-[10px] text-[#17133A]/80 space-y-0.5 list-disc pl-4">
                          {opt.responsibilities.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {opt.expectedPermissions.map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded-full bg-white border border-[#E8E1F5] text-[9px] font-mono text-[#6D28D9]">
                              {p}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={() => setStep(2)}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold text-sm"
          >
            Continue as {selectedType.name}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-md mx-auto space-y-5">
          <div>
            <h1 className="text-2xl font-black text-[#17133A]">Personal & Workspace Info</h1>
            <p className="text-xs text-[#686581] mt-1">
              Requested Role: <strong className="text-[#6D28D9]">{selectedType.name}</strong> (Requires Administrator Approval)
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="relative flex items-center">
              <User className="absolute left-3.5 h-4 w-4 text-[#686581]" />
              <input
                type="text"
                required
                placeholder="Full Name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs"
              />
            </div>

            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-[#686581]" />
              <input
                type="email"
                required
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs"
              />
            </div>

            <div className="relative flex items-center">
              <Phone className="absolute left-3.5 h-4 w-4 text-[#686581]" />
              <input
                type="tel"
                required
                placeholder="Mobile Number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs"
              />
            </div>

            <div className="relative flex items-center">
              <Building2 className="absolute left-3.5 h-4 w-4 text-[#686581]" />
              <input
                type="text"
                placeholder="NGO Workspace Slug (optional, e.g. sriseva)"
                value={form.organizationSlug}
                onChange={(e) => setForm({ ...form, organizationSlug: e.target.value })}
                className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs"
              />
            </div>

            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-[#686581]" />
              <input
                type="password"
                required
                placeholder="Password (min 8 chars, upper, lower, number, symbol)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs"
              />
            </div>

            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-[#686581]" />
              <input
                type="password"
                required
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-2xl text-xs font-bold">
                Back
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold text-xs"
              >
                {submitting ? "Submitting..." : "Submit Registration"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {step === 3 && result && (
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-4 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
            <Clock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black text-[#17133A]">Registration Submitted</h2>
          <p className="text-xs text-[#686581]">
            We sent a verification link to <strong>{result.email}</strong>. Please verify your email address before signing in.
          </p>
          <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] text-xs space-y-1">
            <p>
              <strong>Account Status:</strong>{" "}
              <span className="uppercase font-bold text-[#6D28D9]">
                {result.accountStatus.replace("_", " ")}
              </span>
            </p>
            <p>
              <strong>Requested Role:</strong> {selectedType.name}
            </p>
            {result.organizationName && (
              <p>
                <strong>Workspace:</strong> {result.organizationName}
              </p>
            )}
          </div>
          {result.devVerificationToken && (
            <div className="p-3 rounded-2xl bg-[#F3E8FF] border border-[#DDD6FE] text-xs text-[#4C1D95] space-y-2">
              <p className="font-semibold">
                SMTP email is not configured on this local server. Verify your email directly:
              </p>
              <Link
                href={`/email-verification?token=${encodeURIComponent(result.devVerificationToken)}`}
                className="block"
              >
                <Button className="w-full rounded-2xl bg-[#6D28D9] text-white font-bold text-xs">
                  Verify Email Now →
                </Button>
              </Link>
            </div>
          )}
          <Link href="/login" className="block">
            <Button variant={result.devVerificationToken ? "outline" : "default"} className={`w-full rounded-2xl font-bold text-xs ${result.devVerificationToken ? "" : "bg-[#6D28D9] text-white"}`}>
              Return to Sign In
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
