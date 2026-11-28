"use client";

import React, { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BillingSubNav } from "@/components/billing/BillingSubNav";

export default function NgoPaymentHistoryPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/invoices")
      .then((r) => r.json())
      .then((d) => setPayments(d.payments || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="space-y-4">
        <BillingSubNav title="Payment History" subtitle="Razorpay test transactions & refund records" />

        {loading ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
            Loading payment history...
          </div>
        ) : payments.length === 0 ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
            No payment transactions recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {payments.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#17133A]">
                      ₹{Number(p.amount).toLocaleString("en-IN")} ({p.invoice_number || "Subscription"})
                    </p>
                    <p className="text-[11px] text-[#686581] font-mono">
                      {p.razorpay_payment_id || p.razorpay_order_id || p.gateway}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    p.status === "succeeded"
                      ? "bg-emerald-100 text-emerald-700"
                      : p.status === "failed"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
