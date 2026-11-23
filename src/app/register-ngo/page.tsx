"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  Globe,
  Sparkles,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Heart,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function RegisterNGOPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    orgName: "",
    orgSlug: "",
    registrationNumber: "",
    taxExempt80gNumber: "",
    darpanId: "",
    city: "",
    state: "",
    planSlug: "starter",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPhone: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "orgName" && !formData.orgSlug) {
      // Auto-generate clean slug suggestion
      const suggested = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 30);
      setFormData((prev) => ({ ...prev, orgSlug: suggested }));
    }
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (step === 1) {
      if (!formData.orgName.trim()) {
        setErrorMessage("Please enter your organization or trust name");
        return;
      }
    } else if (step === 2) {
      if (!formData.orgSlug.trim() || formData.orgSlug.length < 3) {
        setErrorMessage("Please provide a valid workspace address (at least 3 characters)");
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    setErrorMessage(null);
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.adminName.trim() || !formData.adminEmail.trim() || !formData.adminPassword) {
      setErrorMessage("Please complete all required administrator fields");
      return;
    }

    if (formData.adminPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register organization workspace");
      }

      await refreshSession();
      router.push("/");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-[#17133A] flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#E8E1F5] bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] bg-clip-text text-transparent">
                ElderCare OS
              </span>
              <span className="block text-[10px] text-[#686581] font-medium uppercase tracking-wider">
                Multi-Tenant SaaS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-[#686581] hidden sm:inline">Already registered?</span>
            <Link
              href="/login"
              className="font-semibold text-[#6D28D9] hover:text-[#4C1D95] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Step Progression Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 text-xs font-semibold text-[#686581]">
            <span className={step >= 1 ? "text-[#6D28D9]" : ""}>1. Organization</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className={step >= 2 ? "text-[#6D28D9]" : ""}>2. Workspace URL</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className={step >= 3 ? "text-[#6D28D9]" : ""}>3. Care Plan</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className={step >= 4 ? "text-[#6D28D9]" : ""}>4. Admin Account</span>
          </div>
          <div className="w-full bg-[#E8E1F5] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Card Shell */}
        <div className="bg-white rounded-3xl border border-[#E8E1F5] shadow-xl shadow-purple-500/5 p-6 sm:p-10">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Organization Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-[#6D28D9] text-xs font-semibold mb-2">
                  <Building2 className="w-3.5 h-3.5" /> Step 1 of 4
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17133A]">
                  Register your Old Age Home or NGO
                </h1>
                <p className="text-sm text-[#686581] mt-1">
                  Create a dedicated, private workspace with separate databases, records, and staff management.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#686581] mb-1.5">
                    NGO / Organization Legal Name *
                  </label>
                  <input
                    type="text"
                    value={formData.orgName}
                    onChange={(e) => updateField("orgName", e.target.value)}
                    placeholder="e.g., Sri Seva Old Age Home & Trust"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E1F5] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#686581] mb-1.5">
                      Trust / Society Reg. No.
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) => updateField("registrationNumber", e.target.value)}
                      placeholder="e.g., DEL/1234/2018"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E1F5] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#686581] mb-1.5">
                      80G Tax Exemption No.
                    </label>
                    <input
                      type="text"
                      value={formData.taxExempt80gNumber}
                      onChange={(e) => updateField("taxExempt80gNumber", e.target.value)}
                      placeholder="e.g., AABTS1234E"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E1F5] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#686581] mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="e.g., New Delhi"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E1F5] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#686581] mb-1.5">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      placeholder="e.g., Delhi"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E1F5] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all"
                >
                  Continue to Workspace URL <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Workspace Subdomain Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-[#6D28D9] text-xs font-semibold mb-2">
                  <Globe className="w-3.5 h-3.5" /> Step 2 of 4
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17133A]">
                  Choose your Workspace Subdomain
                </h1>
                <p className="text-sm text-[#686581] mt-1">
                  Your staff and doctors will use this dedicated address to access patient records and daily logs securely.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#686581] mb-1.5">
                    Workspace Address *
                  </label>
                  <div className="flex items-center rounded-xl border border-[#E8E1F5] bg-gray-50 focus-within:ring-2 focus-within:ring-[#6D28D9] overflow-hidden">
                    <input
                      type="text"
                      value={formData.orgSlug}
                      onChange={(e) => updateField("orgSlug", e.target.value)}
                      placeholder="sriseva"
                      className="w-full px-4 py-3 bg-transparent text-sm font-semibold text-[#17133A] focus:outline-none"
                    />
                    <span className="px-4 py-3 text-sm font-medium text-[#686581] bg-[#F3E8FF] border-l border-[#E8E1F5] whitespace-nowrap">
                      .eldercareos.com
                    </span>
                  </div>
                  <p className="text-xs text-[#686581] mt-2">
                    Only lowercase letters, numbers, and hyphens. Examples: <code className="bg-purple-50 px-1 py-0.5 rounded text-[#6D28D9]">sriseva</code>, <code className="bg-purple-50 px-1 py-0.5 rounded text-[#6D28D9]">karuna-ashram</code>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#6D28D9] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#4C1D95] space-y-1">
                    <p className="font-bold">Automated Database Isolation Guarantee</p>
                    <p>
                      Row-Level Security (RLS) is automatically enabled on all 26 resident, medical, and donation tables. Other NGOs cannot access or read your records.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-5 py-2.5 rounded-xl border border-[#E8E1F5] hover:bg-gray-50 text-sm font-semibold text-[#686581] flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all"
                >
                  Choose Care Plan <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Plan Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-[#6D28D9] text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Step 3 of 4
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17133A]">
                  Select your Subscription Tier
                </h1>
                <p className="text-sm text-[#686581] mt-1">
                  Every new organization receives a <strong className="text-[#6D28D9]">14-Day Full Free Trial</strong> with zero immediate credit card charge.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Starter */}
                <div
                  onClick={() => updateField("planSlug", "starter")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.planSlug === "starter"
                      ? "border-[#6D28D9] bg-purple-50/50 shadow-md"
                      : "border-[#E8E1F5] hover:border-purple-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-[#17133A]">Starter</span>
                    {formData.planSlug === "starter" && <CheckCircle2 className="w-4 h-4 text-[#6D28D9]" />}
                  </div>
                  <div className="text-xl font-extrabold text-[#6D28D9]">₹2,999<span className="text-xs font-medium text-[#686581]">/mo</span></div>
                  <p className="text-xs text-[#686581] mt-2 mb-3">For single-facility elder shelters</p>
                  <ul className="text-xs space-y-1.5 text-[#17133A]">
                    <li>• Up to 30 residents</li>
                    <li>• Up to 5 staff seats</li>
                    <li>• 1 facility branch</li>
                    <li>• 5 GB private storage</li>
                  </ul>
                </div>

                {/* Professional */}
                <div
                  onClick={() => updateField("planSlug", "professional")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                    formData.planSlug === "professional"
                      ? "border-[#6D28D9] bg-purple-50/50 shadow-md"
                      : "border-[#E8E1F5] hover:border-purple-300"
                  }`}
                >
                  <div className="absolute -top-3 right-3 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-[#17133A]">Professional</span>
                    {formData.planSlug === "professional" && <CheckCircle2 className="w-4 h-4 text-[#6D28D9]" />}
                  </div>
                  <div className="text-xl font-extrabold text-[#6D28D9]">₹7,999<span className="text-xs font-medium text-[#686581]">/mo</span></div>
                  <p className="text-xs text-[#686581] mt-2 mb-3">For growing elder care NGOs</p>
                  <ul className="text-xs space-y-1.5 text-[#17133A]">
                    <li>• Up to 100 residents</li>
                    <li>• Up to 25 staff & doctors</li>
                    <li>• Up to 3 branches</li>
                    <li>• 25 GB private storage</li>
                    <li>• Rescue case tracking</li>
                  </ul>
                </div>

                {/* Enterprise */}
                <div
                  onClick={() => updateField("planSlug", "enterprise")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.planSlug === "enterprise"
                      ? "border-[#6D28D9] bg-purple-50/50 shadow-md"
                      : "border-[#E8E1F5] hover:border-purple-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-[#17133A]">Enterprise</span>
                    {formData.planSlug === "enterprise" && <CheckCircle2 className="w-4 h-4 text-[#6D28D9]" />}
                  </div>
                  <div className="text-xl font-extrabold text-[#6D28D9]">₹19,999<span className="text-xs font-medium text-[#686581]">/mo</span></div>
                  <p className="text-xs text-[#686581] mt-2 mb-3">Large charitable healthcare trusts</p>
                  <ul className="text-xs space-y-1.5 text-[#17133A]">
                    <li>• Up to 500 residents</li>
                    <li>• Unlimited staff</li>
                    <li>• Unlimited branches</li>
                    <li>• 100 GB private storage</li>
                    <li>• Dedicated priority support</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-5 py-2.5 rounded-xl border border-[#E8E1F5] hover:bg-gray-50 text-sm font-semibold text-[#686581] flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all"
                >
                  Admin Setup <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Admin Credentials & Provisioning */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-[#6D28D9] text-xs font-semibold mb-2">
                  <UserCheck className="w-3.5 h-3.5" /> Step 4 of 4
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17133A]">
                  Create your NGO Administrator Account
                </h1>
                <p className="text-sm text-[#686581] mt-1">
                  This account holds initial executive authority to invite clinicians, admit residents, and manage facilities.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#686581] mb-1.5">
                    Administrator Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.adminName}
                    onChange={(e) => updateField("adminName", e.target.value)}
                    placeholder="e.g., Dr. Ramesh Sharma"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E1F5] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#686581] mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => updateField("adminEmail", e.target.value)}
                      placeholder="admin@sriseva.org"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E1F5] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#686581] mb-1.5">
                      Mobile / WhatsApp Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.adminPhone}
                      onChange={(e) => updateField("adminPhone", e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E1F5] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#686581] mb-1.5">
                    Account Password * (minimum 8 characters)
                  </label>
                  <input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => updateField("adminPassword", e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E1F5] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-[#E8E1F5] hover:bg-gray-50 text-sm font-semibold text-[#686581] flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:from-[#5B21B6] hover:to-[#7C3AED] text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-purple-500/30 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Provisioning Workspace...
                    </>
                  ) : (
                    <>
                      Launch Workspace <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E1F5] py-6 text-center text-xs text-[#686581]">
        <p>© 2026 ElderCare OS Multi-Tenant Platform. Private & Isolated Healthcare Infrastructure.</p>
      </footer>
    </div>
  );
}
