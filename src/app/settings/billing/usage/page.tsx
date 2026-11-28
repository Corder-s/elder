"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BillingSubNav } from "@/components/billing/BillingSubNav";

function UsageBar({ label, current, limit, unit = "" }: { label: string; current: number; limit: number; unit?: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  return (
    <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[#17133A]">{label}</span>
        <span className="font-black text-[#6D28D9]">
          {current}{unit} / {limit}{unit} ({pct}%)
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[#F3E8FF] overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 90 ? "bg-rose-500" : "bg-[#6D28D9]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function NgoUsagePage() {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/subscription")
      .then((r) => r.json())
      .then((d) => setUsage(d.usage || null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="space-y-4">
        <BillingSubNav title="Plan Usage & Quotas" subtitle="Live PostgreSQL-enforced tenant limits" />

        {loading ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
            Loading usage metrics...
          </div>
        ) : usage ? (
          <div className="space-y-3">
            <UsageBar label="Active Residents" current={usage.residents.currentCount} limit={usage.residents.limit} />
            <UsageBar label="Active Staff & Volunteers" current={usage.staff.currentCount} limit={usage.staff.limit} />
            <UsageBar label="Branches" current={usage.branches.currentCount} limit={usage.branches.limit} />
            <UsageBar
              label="Document Storage"
              current={usage.storageMb.currentCount}
              limit={usage.storageMb.limit}
              unit=" MB"
            />
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-xs text-rose-600">
            Unable to load usage snapshot.
          </div>
        )}
      </div>
    </AppShell>
  );
}
