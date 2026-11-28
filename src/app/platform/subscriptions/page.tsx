"use client";

import React, { useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { Button } from "@/components/ui/button";

export default function PlatformSubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async (status = statusFilter) => {
    setLoading(true);
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`/api/platform/subscriptions${qs}`);
    const json = await res.json();
    setSubs(json.subscriptions || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (organizationId: string, action: string) => {
    setMsg(null);
    const res = await fetch("/api/platform/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, action }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || "Action failed");
    } else {
      setMsg(`Updated subscription to ${json.status}`);
      await load();
    }
  };

  return (
    <PlatformShell
      title="Tenant Subscriptions"
      subtitle="Lifecycle management, grace periods, suspensions & safety mode"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {["", "trial", "active", "grace_period", "past_due", "suspended", "cancelled", "expired"].map(
            (st) => (
              <button
                key={st || "all"}
                onClick={() => {
                  setStatusFilter(st);
                  load(st);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize ${
                  statusFilter === st
                    ? "bg-purple-600 text-white"
                    : "bg-[#181339] text-purple-200 border border-purple-900/40"
                }`}
              >
                {st ? st.replace("_", " ") : "All"}
              </button>
            )
          )}
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-700/40 text-xs text-purple-100">
            {msg}
          </div>
        )}

        {loading ? (
          <div className="p-6 rounded-2xl bg-[#181339] border border-purple-900/40 text-xs text-purple-300">
            Loading subscriptions...
          </div>
        ) : (
          <div className="space-y-3">
            {subs.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-[#181339] border border-purple-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{s.organization_name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-200 text-[10px] font-bold uppercase">
                      {s.status}
                    </span>
                  </div>
                  <p className="text-xs text-purple-300/80">
                    Plan: {s.plan_name} (₹{Number(s.price_monthly_inr).toLocaleString("en-IN")}/mo) •
                    Limits: {s.resident_limit} res / {s.staff_limit} staff / {s.branch_limit} branches
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.status !== "suspended" ? (
                    <Button
                      size="sm"
                      onClick={() => act(s.organization_id, "suspend")}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => act(s.organization_id, "reactivate")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      Reactivate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act(s.organization_id, "enter_grace_period")}
                    className="border-purple-700/50 text-purple-200 text-xs"
                  >
                    Grace Period
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act(s.organization_id, "mark_past_due")}
                    className="border-purple-700/50 text-purple-200 text-xs"
                  >
                    Past Due
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
