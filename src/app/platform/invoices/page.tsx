"use client";

import React, { useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/PlatformShell";

export default function PlatformInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform/billing")
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PlatformShell title="Platform Invoices" subtitle="Immutable SaaS invoices & credit notes across tenants">
      {loading ? (
        <div className="p-6 rounded-2xl bg-[#181339] border border-purple-900/40 text-xs text-purple-300">
          Loading invoices...
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="p-4 rounded-2xl bg-[#181339] border border-purple-900/40 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-white">
                  {inv.invoice_number} — {inv.organization_name}
                </p>
                <p className="text-[11px] text-purple-300">
                  Type: {inv.invoice_type} • Total: ₹{Number(inv.total).toLocaleString("en-IN")}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-900/60 text-purple-200 text-[10px] font-bold uppercase">
                {inv.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </PlatformShell>
  );
}
