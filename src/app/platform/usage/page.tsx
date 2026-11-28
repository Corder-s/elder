"use client";

import React, { useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/PlatformShell";

export default function PlatformUsagePage() {
  const [tenantUsage, setTenantUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform/billing")
      .then((r) => r.json())
      .then((d) => setTenantUsage(d.tenantUsage || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PlatformShell title="Tenant Quota & Usage" subtitle="Aggregate non-clinical resource usage across NGOs">
      {loading ? (
        <div className="p-6 rounded-2xl bg-[#181339] border border-purple-900/40 text-xs text-purple-300">
          Loading usage metrics...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenantUsage.map((u) => (
            <div key={u.organization_id} className="p-4 rounded-2xl bg-[#181339] border border-purple-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{u.organization_name}</h3>
                <span className="text-[11px] text-purple-300 uppercase font-bold">
                  {u.plan_name || "N/A"} • {u.subscription_status || "trial"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-purple-200/80">
                <p>Residents: {u.active_residents} / {u.resident_limit ?? "-"}</p>
                <p>Staff: {u.active_staff} / {u.staff_limit ?? "-"}</p>
                <p>Branches: {u.active_branches} / {u.branch_limit ?? "-"}</p>
                <p>Storage: {Math.round(Number(u.storage_bytes || 0) / (1024 * 1024))} / {u.storage_limit_mb ?? "-"} MB</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PlatformShell>
  );
}
