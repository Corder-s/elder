"use client";

import React, { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BillingSubNav } from "@/components/billing/BillingSubNav";

export default function NgoBillingInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="space-y-4">
        <BillingSubNav title="Invoices" subtitle="Immutable SaaS tax invoices & credit notes" />

        {loading ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
            No invoices generated yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#17133A]">{inv.invoice_number}</p>
                    <p className="text-[11px] text-[#686581]">
                      ₹{Number(inv.total).toLocaleString("en-IN")} •{" "}
                      <span className="uppercase font-bold">{inv.status}</span>
                    </p>
                  </div>
                </div>
                <a
                  href={`/api/billing/invoices/${inv.id}/pdf`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] text-xs font-bold text-[#6D28D9] hover:bg-[#F3E8FF]"
                >
                  <Download className="h-3.5 w-3.5" /> PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
