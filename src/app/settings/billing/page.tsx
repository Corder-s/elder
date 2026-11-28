"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ShieldAlert, ArrowUpRight, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BillingSubNav } from "@/components/billing/BillingSubNav";
import { Button } from "@/components/ui/button";

export default function NgoBillingOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/subscription");
      const json = await res.json();
      setData(json);
    } catch {
      setMessage("Failed to load subscription details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLifecycleAction = async (action: "cancel" | "reactivate") => {
    setBusyAction(action);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      setMessage(`Subscription updated: ${json.status}`);
      await loadData();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  const sub = data?.subscription;
  const safety = data?.safetyPolicy;
  const usage = data?.usage;

  return (
    <AppShell>
      <div className="space-y-4">
        <BillingSubNav
          title="Subscription & Billing"
          subtitle="Manage your NGO plan, renewals & safety mode"
        />

        {message && (
          <div className="p-3 rounded-2xl bg-[#F3E8FF] border border-[#D8B4FE] text-xs font-semibold text-[#5B21B6]">
            {message}
          </div>
        )}

        {safety?.billingWarning && (
          <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">Healthcare Safety Mode Notice</p>
              <p>{safety.billingWarning}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
            Loading subscription details...
          </div>
        ) : sub ? (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#686581]">
                    Current Plan
                  </span>
                  <h2 className="text-xl font-black text-[#17133A]">{sub.plan_name}</h2>
                  <p className="text-xs text-[#686581]">
                    ₹{Number(sub.price_monthly_inr).toLocaleString("en-IN")}/month •{" "}
                    <span className="capitalize">{sub.billing_interval}</span> billing
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    sub.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : sub.status === "trial"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {sub.status.replace("_", " ")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]">
                  <p className="text-[#686581]">Current Period End</p>
                  <p className="font-bold text-[#17133A]">
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString("en-IN")
                      : "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]">
                  <p className="text-[#686581]">Next Renewal</p>
                  <p className="font-bold text-[#17133A]">
                    {sub.next_renewal_at
                      ? new Date(sub.next_renewal_at).toLocaleDateString("en-IN")
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/settings/billing/plans">
                  <Button className="rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold">
                    Upgrade / Change Plan <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
                {sub.status !== "cancelled" ? (
                  <Button
                    variant="outline"
                    disabled={busyAction !== null}
                    onClick={() => handleLifecycleAction("cancel")}
                    className="rounded-2xl border-[#E8E1F5] text-xs font-bold text-rose-600"
                  >
                    {busyAction === "cancel" ? "Cancelling..." : "Cancel Renewal"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={busyAction !== null}
                    onClick={() => handleLifecycleAction("reactivate")}
                    className="rounded-2xl border-[#E8E1F5] text-xs font-bold text-[#6D28D9]"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    {busyAction === "reactivate" ? "Reactivating..." : "Reactivate"}
                  </Button>
                )}
              </div>
            </div>

            {usage && (
              <div className="p-5 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#17133A]">Quota Snapshot</h3>
                  <Link
                    href="/settings/billing/usage"
                    className="text-xs font-bold text-[#6D28D9]"
                  >
                    Full Usage →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-[#FAF8FF]">
                    <p className="text-[#686581]">Residents</p>
                    <p className="text-base font-black text-[#17133A]">
                      {usage.residents.currentCount} / {usage.residents.limit}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FAF8FF]">
                    <p className="text-[#686581]">Active Staff</p>
                    <p className="text-base font-black text-[#17133A]">
                      {usage.staff.currentCount} / {usage.staff.limit}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FAF8FF]">
                    <p className="text-[#686581]">Branches</p>
                    <p className="text-base font-black text-[#17133A]">
                      {usage.branches.currentCount} / {usage.branches.limit}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FAF8FF]">
                    <p className="text-[#686581]">Storage</p>
                    <p className="text-base font-black text-[#17133A]">
                      {usage.storageMb.currentCount} / {usage.storageMb.limit} MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
              {safety?.isReadOnlySafetyMode ? (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <span>
                Clinical care, medication schedules, and resident health records are protected under
                ElderCare OS Healthcare Safety Mode.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-xs text-rose-600">
            {data?.error || "Unable to load subscription."}
          </div>
        )}
      </div>
    </AppShell>
  );
}
