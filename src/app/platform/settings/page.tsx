"use client";

import React, { useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { Button } from "@/components/ui/button";

export default function PlatformSettingsPage() {
  const [trialDays, setTrialDays] = useState("14");
  const [graceDays, setGraceDays] = useState("7");
  const [pastDueDays, setPastDueDays] = useState("14");
  const [supportEmail, setSupportEmail] = useState("billing@eldercareos.com");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform/billing")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setTrialDays(String(d.settings.default_trial_days ?? 14));
          setGraceDays(String(d.settings.grace_period_days ?? 7));
          setPastDueDays(String(d.settings.past_due_tolerance_days ?? 14));
          setSupportEmail(d.settings.support_billing_email ?? "billing@eldercareos.com");
        }
      });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/platform/billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultTrialDays: Number(trialDays),
        gracePeriodDays: Number(graceDays),
        pastDueToleranceDays: Number(pastDueDays),
        supportBillingEmail: supportEmail,
      }),
    });
    const json = await res.json();
    setMsg(res.ok ? "Platform billing settings saved." : json.error || "Failed to save");
  };

  return (
    <PlatformShell title="Platform Billing Settings" subtitle="Trial windows, grace periods & Razorpay test mode">
      <form onSubmit={save} className="max-w-xl p-6 rounded-2xl bg-[#181339] border border-purple-900/40 space-y-4">
        {msg && (
          <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-700/40 text-xs text-purple-100">
            {msg}
          </div>
        )}
        <div>
          <label className="text-xs text-purple-200 block mb-1">Default Trial Days</label>
          <input
            type="number"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0D0B1E] border border-purple-900/50 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-xs text-purple-200 block mb-1">Grace Period Days</label>
          <input
            type="number"
            value={graceDays}
            onChange={(e) => setGraceDays(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0D0B1E] border border-purple-900/50 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-xs text-purple-200 block mb-1">Past Due Tolerance Days</label>
          <input
            type="number"
            value={pastDueDays}
            onChange={(e) => setPastDueDays(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0D0B1E] border border-purple-900/50 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-xs text-purple-200 block mb-1">Support Billing Email</label>
          <input
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0D0B1E] border border-purple-900/50 text-xs text-white"
          />
        </div>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold">
          Save Settings
        </Button>
      </form>
    </PlatformShell>
  );
}
