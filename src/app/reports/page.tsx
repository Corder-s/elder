"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BarChart3, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load analytics");
      setReport(data.report);
    } catch (err: any) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

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
              <h1 className="text-lg font-black text-[#17133A]">Reports &amp; Analytics</h1>
              <p className="text-[11px] text-[#686581]">Live PostgreSQL operational metrics</p>
            </div>
          </div>
          <Badge variant="purple">Live SQL</Badge>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-center justify-between">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
            <button onClick={loadReport} className="font-bold underline flex items-center gap-1"><RefreshCw className="h-3 w-3" />Retry</button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-[#686581]">Aggregating live organization metrics...</div>
        ) : !report ? null : (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card">
              <span className="text-[10px] font-bold text-[#686581] uppercase">Active Residents</span>
              <p className="text-2xl font-black text-[#6D28D9] mt-1">{report.residents?.active ?? 0}</p>
              <span className="text-[11px] text-[#686581]">Total: {report.residents?.total ?? 0}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card">
              <span className="text-[10px] font-bold text-[#686581] uppercase">Bed Occupancy</span>
              <p className="text-2xl font-black text-[#17133A] mt-1">
                {report.facilities?.occupiedBeds ?? 0}/{report.facilities?.totalBeds ?? 0}
              </p>
              <span className="text-[11px] text-[#686581]">Available: {report.facilities?.availableBeds ?? 0}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card">
              <span className="text-[10px] font-bold text-[#686581] uppercase">Rescue Cases</span>
              <p className="text-2xl font-black text-[#EA580C] mt-1">{report.rescue?.open ?? 0}</p>
              <span className="text-[11px] text-[#686581]">Resolved: {report.rescue?.resolved ?? 0}</span>
            </div>
            <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card">
              <span className="text-[10px] font-bold text-[#686581] uppercase">Active Staff</span>
              <p className="text-2xl font-black text-[#16A34A] mt-1">{report.staff?.activeMembers ?? 0}</p>
              <span className="text-[11px] text-[#686581]">Volunteers: {report.staff?.volunteers ?? 0}</span>
            </div>
            {report.finance && (
              <div className="col-span-2 p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#686581] uppercase">Financial Summary</span>
                  <p className="text-sm font-black text-[#17133A] mt-0.5">
                    Donations: ₹{report.finance.totalDonations.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-[#686581]">
                    Expenses: ₹{report.finance.totalExpenses.toLocaleString("en-IN")}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-[#6D28D9]" />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
