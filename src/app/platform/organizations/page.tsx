"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Building2, CheckCircle2, Ban, Search, RefreshCw } from "lucide-react";

export default function PlatformOrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrgs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/platform/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.organizations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const toggleStatus = async (orgId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" || currentStatus === "trial" ? "suspended" : "active";
    setActionLoading(orgId);
    try {
      const res = await fetch("/api/platform/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, status: newStatus }),
      });
      if (res.ok) {
        await fetchOrgs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrgs = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()) ||
      o.primary_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0D0B1E] text-white flex flex-col">
      <header className="border-b border-purple-900/40 bg-[#14102E]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/platform/dashboard" className="p-1.5 rounded-lg hover:bg-purple-900/40 text-purple-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">Registered NGO Workspaces</h1>
            <span className="text-[10px] text-purple-300/70 font-semibold uppercase tracking-wider">
              {orgs.length} Total Tenant Workspaces
            </span>
          </div>
        </div>

        <button
          onClick={fetchOrgs}
          className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/40 hover:bg-purple-900/60 text-purple-300 text-xs font-semibold flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by NGO name, slug or email..."
              className="w-full bg-[#181339] border border-purple-900/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#181339] border border-purple-900/40 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-900/40 bg-[#14102E] text-purple-300/80 uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Organization</th>
                  <th className="py-3.5 px-4">Subdomain</th>
                  <th className="py-3.5 px-4">Subscription Plan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Primary Contact</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-purple-400">
                      Loading organizations...
                    </td>
                  </tr>
                ) : filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-purple-400">
                      No organizations found.
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-purple-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center gap-2.5">
                          <Building2 className="w-4 h-4 text-[#8B5CF6]" />
                          <span>{org.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-purple-300">
                        <code className="bg-purple-950 px-1.5 py-0.5 rounded text-[11px] font-mono text-purple-200">
                          {org.slug}.eldercareos.com
                        </code>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white">{org.plan_name || "Starter"}</span>
                        <span className="block text-[10px] text-purple-300/60">
                          Max: {org.resident_limit || 30} residents
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            org.status === "active"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : org.status === "trial"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-purple-200">
                        <div>{org.primary_email}</div>
                        {org.primary_phone && (
                          <div className="text-[10px] text-purple-400">{org.primary_phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => toggleStatus(org.id, org.status)}
                          disabled={actionLoading === org.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            org.status === "suspended"
                              ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                              : "bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-800/50"
                          }`}
                        >
                          {actionLoading === org.id
                            ? "Updating..."
                            : org.status === "suspended"
                            ? "Reactivate"
                            : "Suspend"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
