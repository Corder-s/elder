"use client";

import React, { useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { Button } from "@/components/ui/button";

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [priceMonthlyInr, setPriceMonthlyInr] = useState("4999");
  const [residentLimit, setResidentLimit] = useState("75");
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/platform/plans");
    const json = await res.json();
    setPlans(json.plans || []);
  };

  useEffect(() => {
    load();
  }, []);

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/platform/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        priceMonthlyInr: Number(priceMonthlyInr),
        priceAnnualInr: Number(priceMonthlyInr) * 10,
        residentLimit: Number(residentLimit),
        staffLimit: 25,
        branchLimit: 3,
        storageLimitMb: 20480,
      }),
    });
    const json = await res.json();
    if (!res.ok) setMsg(json.error);
    else {
      setName("");
      setSlug("");
      setMsg(`Created plan ${json.plan.name}`);
      await load();
    }
  };

  const toggleActive = async (plan: any) => {
    setMsg(null);
    const res = await fetch("/api/platform/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, isActive: !plan.isActive }),
    });
    const json = await res.json();
    if (!res.ok) setMsg(json.error);
    else await load();
  };

  return (
    <PlatformShell title="Subscription Plans" subtitle="Configure SaaS tiers, limits & feature flags">
      <div className="space-y-6">
        {msg && (
          <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-700/40 text-xs text-purple-100">
            {msg}
          </div>
        )}

        <form
          onSubmit={createPlan}
          className="p-4 rounded-2xl bg-[#181339] border border-purple-900/40 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
        >
          <div>
            <label className="text-[11px] text-purple-300 block mb-1">Plan Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Growth"
              className="w-full px-3 py-2 rounded-xl bg-[#0D0B1E] border border-purple-900/50 text-xs text-white"
              required
            />
          </div>
          <div>
            <label className="text-[11px] text-purple-300 block mb-1">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="growth"
              className="w-full px-3 py-2 rounded-xl bg-[#0D0B1E] border border-purple-900/50 text-xs text-white"
              required
            />
          </div>
          <div>
            <label className="text-[11px] text-purple-300 block mb-1">Monthly (₹)</label>
            <input
              type="number"
              value={priceMonthlyInr}
              onChange={(e) => setPriceMonthlyInr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0D0B1E] border border-purple-900/50 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-purple-300 block mb-1">Resident Limit</label>
            <input
              type="number"
              value={residentLimit}
              onChange={(e) => setResidentLimit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0D0B1E] border border-purple-900/50 text-xs text-white"
            />
          </div>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold">
            Create Plan
          </Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="p-5 rounded-2xl bg-[#181339] border border-purple-900/40 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-purple-300 font-mono">{p.slug}</p>
                </div>
                <span className="text-xs font-bold text-purple-200">{p.activeTenants} NGOs</span>
              </div>
              <p className="text-xl font-black text-white">
                ₹{Number(p.priceMonthlyInr).toLocaleString("en-IN")}
                <span className="text-xs font-normal text-purple-300">/mo</span>
              </p>
              <div className="text-xs text-purple-200/80 space-y-1">
                <p>Residents: {p.residentLimit} • Staff: {p.staffLimit}</p>
                <p>Branches: {p.branchLimit} • Storage: {p.storageLimitMb} MB</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleActive(p)}
                className="border-purple-700/50 text-purple-200 text-xs"
              >
                {p.isActive ? "Deactivate Plan" : "Activate Plan"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </PlatformShell>
  );
}
