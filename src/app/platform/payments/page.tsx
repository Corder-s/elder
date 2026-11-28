"use client";

import React, { useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/PlatformShell";

export default function PlatformPaymentsPage() {
  const [data, setData] = useState<any>({ payments: [], webhooks: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform/billing")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PlatformShell title="Payments & Webhooks" subtitle="Razorpay test-mode transactions & webhook audit log">
      {loading ? (
        <div className="p-6 rounded-2xl bg-[#181339] border border-purple-900/40 text-xs text-purple-300">
          Loading payment records...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white">Subscription Payments</h2>
            {(data.payments || []).map((p: any) => (
              <div key={p.id} className="p-4 rounded-2xl bg-[#181339] border border-purple-900/40 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-white">
                    {p.organization_name || "NGO"} — ₹{Number(p.amount).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-purple-300 font-mono">
                    {p.razorpay_payment_id || p.razorpay_order_id || p.invoice_number}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-900/60 text-purple-200 text-[10px] font-bold uppercase">
                  {p.status}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white">Webhook Events</h2>
            {(data.webhooks || []).map((w: any) => (
              <div key={w.id} className="p-4 rounded-2xl bg-[#181339] border border-purple-900/40 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-white">{w.event_type}</p>
                  <p className="text-[11px] text-purple-300 font-mono">{w.event_id}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-900/60 text-purple-200 text-[10px] font-bold uppercase">
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PlatformShell>
  );
}
