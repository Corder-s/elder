"use client";

import React, { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BillingSubNav } from "@/components/billing/BillingSubNav";
import { Button } from "@/components/ui/button";

export default function NgoBillingPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/billing/subscription");
    const json = await res.json();
    setPlans(json.plans || []);
    setCurrentPlanId(json.subscription?.plan_id || null);
  };

  useEffect(() => {
    load();
  }, []);

  const startCheckout = async (plan: any) => {
    setBusyPlan(plan.id);
    setStatusMsg(null);
    setCheckoutOrder(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanSlugOrId: plan.id, billingInterval: interval }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      setCheckoutOrder({ ...json, plan });
      setStatusMsg(`Test order ${json.razorpayOrder.orderId} created for ${plan.name} (₹${json.razorpayOrder.amountPaise / 100}).`);
    } catch (err: any) {
      setStatusMsg(err.message);
    } finally {
      setBusyPlan(null);
    }
  };

  const handleDowngrade = async (plan: any) => {
    setBusyPlan(plan.id);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "downgrade", targetPlanId: plan.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Downgrade failed");
      setStatusMsg(`Plan downgraded to ${plan.name}.`);
      await load();
    } catch (err: any) {
      setStatusMsg(err.message);
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <BillingSubNav title="Plans & Upgrades" subtitle="Compare NGO plans & Razorpay test checkout" />

        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#E8E1F5] w-fit">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              interval === "monthly" ? "bg-[#6D28D9] text-white" : "text-[#686581]"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("annual")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              interval === "annual" ? "bg-[#6D28D9] text-white" : "text-[#686581]"
            }`}
          >
            Annual
          </button>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-2xl bg-[#F3E8FF] border border-[#D8B4FE] text-xs font-semibold text-[#5B21B6]">
            {statusMsg}
          </div>
        )}

        {checkoutOrder && (
          <div className="p-4 rounded-3xl bg-white border border-[#6D28D9] shadow-card space-y-2 text-xs">
            <p className="font-black text-[#17133A]">Razorpay Test Order Ready</p>
            <p className="text-[#686581]">
              Order ID: <span className="font-mono font-bold">{checkoutOrder.razorpayOrder.orderId}</span> •
              Invoice: <span className="font-mono font-bold">{checkoutOrder.invoice.invoice_number}</span>
            </p>
            <p className="text-[#686581]">
              Gateway Mode: <span className="uppercase font-bold">{checkoutOrder.razorpayOrder.mode}</span> (Test-mode only, no live charge).
            </p>
          </div>
        )}

        <div className="space-y-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const price = interval === "annual" ? plan.priceAnnualInr : plan.priceMonthlyInr;
            return (
              <div
                key={plan.id}
                className={`p-5 rounded-3xl bg-white border shadow-card space-y-3 ${
                  isCurrent ? "border-[#6D28D9]" : "border-[#E8E1F5]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-[#17133A]">{plan.name}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#6D28D9] text-[10px] font-bold">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#686581]">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[#17133A]">
                      ₹{Number(price).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-[#686581]">per {interval === "annual" ? "year" : "month"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-[#17133A]">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#6D28D9]" /> {plan.residentLimit} Residents
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#6D28D9]" /> {plan.staffLimit} Staff
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#6D28D9]" /> {plan.branchLimit} Branches
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[#6D28D9]" /> {plan.storageLimitMb} MB Storage
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    disabled={busyPlan !== null}
                    onClick={() => startCheckout(plan)}
                    className="rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {isCurrent ? "Renew Plan" : "Select & Pay (Test)"}
                  </Button>
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      disabled={busyPlan !== null}
                      onClick={() => handleDowngrade(plan)}
                      className="rounded-2xl border-[#E8E1F5] text-xs font-bold"
                    >
                      Switch / Downgrade
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
