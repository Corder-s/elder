"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Building2,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  ArrowUpRight,
  LogOut,
  RefreshCw,
} from "lucide-react";

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = React.useCallback(async () => {
    try {
      const res = await fetch("/api/platform/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      } else if (res.status === 403 || res.status === 401) {
        router.push("/platform/login");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/platform/login");
  };

  return (
    <div className="min-h-screen bg-[#0D0B1E] text-white flex flex-col">
      {/* Top Console Bar */}
      <header className="border-b border-purple-900/40 bg-[#14102E]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">ElderCare OS Platform Owner</h1>
            <span className="text-[10px] text-purple-300/70 font-semibold uppercase tracking-wider">
              Central Multi-Tenant Infrastructure
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-4 text-xs font-semibold">
          <Link href="/platform/dashboard" className="text-[#8B5CF6] bg-purple-950/60 px-3 py-1.5 rounded-lg border border-purple-800/40">
            Overview
          </Link>
          <Link href="/platform/organizations" className="text-purple-300 hover:text-white transition-colors">
            Organizations
          </Link>
          <button
            onClick={fetchMetrics}
            className="p-1.5 rounded-lg hover:bg-purple-900/40 text-purple-300"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Platform SaaS Telemetry</h2>
          <p className="text-xs text-purple-300/70 mt-1">
            Global metrics across all independent NGO tenants. (Healthcare Medical Privacy strictly preserved).
          </p>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#181339] border border-purple-900/40 rounded-2xl p-5">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total NGOs</span>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-3xl font-extrabold text-white">
              {loading ? "..." : metrics?.organizations?.total || 0}
            </div>
            <div className="mt-2 text-[11px] text-purple-300/60 flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">{metrics?.organizations?.active || 0} Active</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{metrics?.organizations?.trial || 0} Trial</span>
            </div>
          </div>

          <div className="bg-[#181339] border border-purple-900/40 rounded-2xl p-5">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Monthly Recurring (MRR)</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">
              ₹{loading ? "..." : (metrics?.revenue?.mrrInr || 0).toLocaleString("en-IN")}
            </div>
            <div className="mt-2 text-[11px] text-purple-300/60">
              Projected ARR: ₹{(metrics?.revenue?.arrInr || 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-[#181339] border border-purple-900/40 rounded-2xl p-5">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Residents Under Care</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-3xl font-extrabold text-purple-200">
              {loading ? "..." : metrics?.telemetry?.totalResidents || 0}
            </div>
            <div className="mt-2 text-[11px] text-purple-300/60">
              Across {metrics?.telemetry?.totalBranches || 1} Care Facilities
            </div>
          </div>

          <div className="bg-[#181339] border border-purple-900/40 rounded-2xl p-5">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Security Engine</span>
              <Server className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>RLS Active</span>
            </div>
            <div className="mt-2 text-[11px] text-purple-300/60">
              PostgreSQL 18.6 Multi-Tenant RLS
            </div>
          </div>
        </div>

        {/* Quick Links & Platform Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#181339] border border-purple-900/40 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#8B5CF6]" /> Workspace Management
            </h3>
            <p className="text-xs text-purple-300/70">
              Inspect registered NGOs, monitor subscription statuses, enforce quotas, or suspend delinquent organizations.
            </p>
            <div className="pt-2">
              <Link
                href="/platform/organizations"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-xs font-bold text-white transition-all shadow-md shadow-purple-900/40"
              >
                View Registered NGOs <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-[#181339] border border-purple-900/40 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Medical Privacy Boundary
            </h3>
            <p className="text-xs text-purple-300/70 leading-relaxed">
              By architectural design, the Platform Owner holds zero read permissions over resident clinical records, doctor consultations, prescriptions, or medical vitals. Clinical records are locked within each NGO&apos;s isolated database boundary.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> HIPAA / DISHA Privacy Boundary Active
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
