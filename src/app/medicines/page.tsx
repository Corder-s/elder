"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Pill, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default function MedicinesPage() {
  const [tab, setTab] = useState<"schedules" | "prescriptions">("schedules");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/medicines");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load medication data");
      setPrescriptions(data.prescriptions || []);
      setSchedules(data.schedules || []);
    } catch (err: any) {
      setError(err.message);
      setPrescriptions([]);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recordDose = async (scheduleId: string, status: "administered" | "missed" | "refused") => {
    setError(null);
    try {
      const res = await fetch(`/api/medicines/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "administer_schedule", status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update dose");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#17133A]">Medicines &amp; Doses</h1>
              <p className="text-[11px] text-[#686581]">Prescriptions &amp; administration logs</p>
            </div>
          </div>
          <Badge variant="purple">MAR</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white border border-[#E8E1F5]">
          <button
            onClick={() => setTab("schedules")}
            className={`py-2 rounded-xl text-xs font-bold transition-colors ${
              tab === "schedules" ? "bg-[#6D28D9] text-white" : "text-[#686581]"
            }`}
          >
            Dose Schedules
          </button>
          <button
            onClick={() => setTab("prescriptions")}
            className={`py-2 rounded-xl text-xs font-bold transition-colors ${
              tab === "prescriptions" ? "bg-[#6D28D9] text-white" : "text-[#686581]"
            }`}
          >
            Prescriptions
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={loadData} className="font-bold underline flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-[#686581]">Loading medication records...</div>
        ) : tab === "schedules" ? (
          schedules.length === 0 ? (
            <EmptyState icon={<Pill className="h-6 w-6" />} title="No scheduled doses" description="No medication doses scheduled yet." />
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => (
                <div key={s.id} className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-black text-[#17133A]">{s.medicine_name}</h3>
                      <p className="text-xs text-[#686581]">
                        {s.resident_name} • {s.dosage} ({s.route})
                      </p>
                    </div>
                    <Badge variant={s.status === "administered" ? "success" : s.status === "pending" ? "purple" : "danger"}>
                      {s.status}
                    </Badge>
                  </div>
                  {s.status === "pending" && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <Button
                        onClick={() => recordDose(s.id, "administered")}
                        className="h-8 rounded-xl bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Given
                      </Button>
                      <Button
                        onClick={() => recordDose(s.id, "missed")}
                        className="h-8 rounded-xl bg-[#FEF3C7] text-[#D97706] text-[11px] font-bold"
                      >
                        Missed
                      </Button>
                      <Button
                        onClick={() => recordDose(s.id, "refused")}
                        className="h-8 rounded-xl bg-[#FFE4E6] text-[#E11D48] text-[11px] font-bold"
                      >
                        Refused
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : prescriptions.length === 0 ? (
          <EmptyState icon={<Pill className="h-6 w-6" />} title="No prescriptions" description="No active prescriptions found." />
        ) : (
          <div className="space-y-3">
            {prescriptions.map((p) => (
              <div key={p.id} className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#17133A]">{p.medicine_name}</h3>
                  <Badge variant={p.is_active ? "success" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-xs text-[#686581]">
                  {p.resident_name} • {p.dosage} • {p.frequency}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
