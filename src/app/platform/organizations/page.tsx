"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Search,
  RefreshCw,
  Plus,
  Edit3,
  Users,
  X,
  CheckCircle2,
  Ban,
} from "lucide-react";

export default function PlatformOrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<{
    name: string;
    branchName?: string;
    orgStatus?: string;
    invitationStatus?: string;
    token?: string;
  } | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    primaryEmail: "",
    primaryPhone: "",
    addressLine1: "",
    city: "",
    state: "",
    registrationNumber: "",
    planSlug: "starter",
    branchName: "Main Facility",
    branchCode: "HQ-01",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    adminContactPhone: "",
  });

  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [inspectOrg, setInspectOrg] = useState<any | null>(null);
  const [inspectData, setInspectData] = useState<any | null>(null);

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
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setActionLoading("create");
    try {
      const res = await fetch("/api/platform/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to provision organization");
        return;
      }
      setCreateSuccess({
        name: data.organization.name,
        branchName: data.initialBranch?.name,
        orgStatus: data.organization.status,
        invitationStatus: data.invitationStatus,
        token: data.devInvitationToken,
      });
      await fetchOrgs();
    } catch {
      setCreateError("Network error while creating organization");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    setActionLoading("edit");
    try {
      const res = await fetch("/api/platform/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: editingOrg.id,
          name: editingOrg.name,
          primaryEmail: editingOrg.primary_email,
          primaryPhone: editingOrg.primary_phone,
          city: editingOrg.city,
          state: editingOrg.state,
          allowAccessRequests: Boolean(editingOrg.allow_access_requests),
        }),
      });
      if (res.ok) {
        setEditingOrg(null);
        await fetchOrgs();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const openInspect = async (org: any) => {
    setInspectOrg(org);
    setInspectData(null);
    const res = await fetch(`/api/platform/organizations/${org.id}/users`);
    if (res.ok) {
      setInspectData(await res.json());
    }
  };

  const filteredOrgs = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()) ||
      (o.primary_email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0D0B1E] text-white flex flex-col">
      <header className="border-b border-purple-900/40 bg-[#14102E]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/platform/overview" className="p-1.5 rounded-lg hover:bg-purple-900/40 text-purple-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">Platform Organization Console</h1>
            <span className="text-[10px] text-purple-300/70 font-semibold uppercase tracking-wider">
              {orgs.length} Provisioned NGO Workspaces
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCreateError(null);
              setCreateSuccess(null);
              setShowCreate(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Create Organization
          </button>
          <button
            onClick={fetchOrgs}
            className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/40 hover:bg-purple-900/60 text-purple-300 text-xs font-semibold flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
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

        <div className="bg-[#181339] border border-purple-900/40 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-purple-900/40 bg-[#14102E] text-purple-300/80 uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Organization</th>
                  <th className="py-3.5 px-4">Assigned Admin</th>
                  <th className="py-3.5 px-4">Counts &amp; Storage</th>
                  <th className="py-3.5 px-4">Subscription</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
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
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 font-bold text-white">
                          <Building2 className="w-4 h-4 text-[#8B5CF6]" />
                          <span>{org.name}</span>
                        </div>
                        <code className="text-[10px] text-purple-300/80 font-mono">
                          {org.slug} • {org.city || "India"}
                        </code>
                        <p className="text-[10px] text-purple-300/60">
                          Created {new Date(org.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-white">{org.assigned_admin_name || "Pending Invitation"}</p>
                        <p className="text-[10px] text-purple-300/70">{org.assigned_admin_email || org.primary_email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-purple-200">
                        <p>{org.user_count ?? 0} users • {org.resident_count ?? 0} residents</p>
                        <p className="text-[10px] text-purple-300/70">
                          {org.branch_count ?? 0} branches • {Math.round(Number(org.storage_bytes || 0) / 1024)} KB
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white">{org.plan_name || "Starter"}</span>
                        <span className="block text-[10px] text-purple-300/60">
                          {org.subscription_status || org.status}
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
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openInspect(org)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-950 text-purple-200 border border-purple-800/50 text-[11px] font-bold hover:bg-purple-900/60 inline-flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" /> Users
                        </button>
                        <button
                          onClick={() => setEditingOrg({ ...org })}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-950 text-purple-200 border border-purple-800/50 text-[11px] font-bold hover:bg-purple-900/60 inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          disabled={actionLoading === org.id}
                          onClick={() => toggleStatus(org.id, org.status)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${
                            org.status === "suspended"
                              ? "bg-emerald-900/60 text-emerald-200 border border-emerald-700"
                              : "bg-rose-950/80 text-rose-200 border border-rose-800"
                          }`}
                        >
                          {org.status === "suspended" ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          {org.status === "suspended" ? "Activate" : "Suspend"}
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

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateOrg}
            className="bg-[#181339] border border-purple-800/60 rounded-2xl max-w-xl w-full p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold">Provision New NGO Organization</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-purple-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-700 text-rose-200">{createError}</div>}
            {createSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-200 space-y-1">
                <p className="font-bold">Organization &quot;{createSuccess.name}&quot; provisioned!</p>
                <p className="text-[11px]">
                  Organization Status: <span className="uppercase font-bold">{createSuccess.orgStatus || "trial"}</span>
                  {createSuccess.branchName ? ` • Initial Branch: ${createSuccess.branchName}` : ""}
                </p>
                <p className="text-[11px]">
                  Invitation Status: <span className="font-bold">{createSuccess.invitationStatus === "sent" ? "Invitation email sent" : "Invitation created (pending acceptance)"}</span>
                </p>
                {createSuccess.token && (
                  <p className="font-mono break-all text-[11px]">
                    Initial Admin Invite Token: {createSuccess.token}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required placeholder="NGO Name *" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
              <input required placeholder="Slug (e.g. seva-home) *" value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
              <input required type="email" placeholder="Official Email *" value={createForm.primaryEmail} onChange={(e) => setCreateForm({ ...createForm, primaryEmail: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
              <input placeholder="Contact Number" value={createForm.primaryPhone} onChange={(e) => setCreateForm({ ...createForm, primaryPhone: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
              <input placeholder="Address" value={createForm.addressLine1} onChange={(e) => setCreateForm({ ...createForm, addressLine1: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2 sm:col-span-2" />
              <input placeholder="City" value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
              <input placeholder="Registration Number" value={createForm.registrationNumber} onChange={(e) => setCreateForm({ ...createForm, registrationNumber: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
              <input placeholder="Initial Branch Name" value={createForm.branchName} onChange={(e) => setCreateForm({ ...createForm, branchName: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
              <select value={createForm.planSlug} onChange={(e) => setCreateForm({ ...createForm, planSlug: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2">
                <option value="starter">Starter Plan</option>
                <option value="growth">Growth Plan</option>
                <option value="enterprise">Enterprise Plan</option>
              </select>
            </div>

            <div className="border-t border-purple-900/60 pt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-purple-300">Initial NGO Administrator</p>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-200 text-[10px] font-bold uppercase tracking-wider">
                  Role: NGO Administrator
                </span>
              </div>
              <p className="text-[10px] text-purple-300/70">
                The NGO Administrator role is assigned automatically by the backend upon invitation acceptance.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input required placeholder="Administrator Full Name *" value={createForm.adminName} onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
                <input required type="email" placeholder="Administrator Email *" value={createForm.adminEmail} onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
                <input placeholder="Mobile Number" value={createForm.adminPhone} onChange={(e) => setCreateForm({ ...createForm, adminPhone: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
                <input placeholder="Contact Number (optional)" value={createForm.adminContactPhone} onChange={(e) => setCreateForm({ ...createForm, adminContactPhone: e.target.value })} className="bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl border border-purple-800 text-purple-300">
                Close
              </button>
              <button type="submit" disabled={actionLoading === "create"} className="px-4 py-2 rounded-xl bg-[#6D28D9] text-white font-bold">
                {actionLoading === "create" ? "Provisioning..." : "Create Organization"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingOrg && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-[#181339] border border-purple-800/60 rounded-2xl max-w-md w-full p-6 space-y-3 text-xs">
            <h2 className="text-base font-extrabold">Edit Organization</h2>
            <input value={editingOrg.name} onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })} className="w-full bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" placeholder="Name" />
            <input value={editingOrg.primary_email} onChange={(e) => setEditingOrg({ ...editingOrg, primary_email: e.target.value })} className="w-full bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" placeholder="Email" />
            <input value={editingOrg.primary_phone || ""} onChange={(e) => setEditingOrg({ ...editingOrg, primary_phone: e.target.value })} className="w-full bg-[#14102E] border border-purple-900 rounded-xl px-3 py-2" placeholder="Phone" />
            <label className="flex items-center gap-2 text-purple-200">
              <input type="checkbox" checked={Boolean(editingOrg.allow_access_requests)} onChange={(e) => setEditingOrg({ ...editingOrg, allow_access_requests: e.target.checked })} />
              Allow public access requests by organization code
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingOrg(null)} className="px-3 py-2 rounded-xl border border-purple-800 text-purple-300">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#6D28D9] text-white font-bold">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {inspectOrg && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#181339] border border-purple-800/60 rounded-2xl max-w-2xl w-full p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold">{inspectOrg.name} — Users &amp; Activity</h2>
              <button onClick={() => setInspectOrg(null)} className="text-purple-300"><X className="w-4 h-4" /></button>
            </div>
            {!inspectData ? (
              <p className="text-purple-300">Loading...</p>
            ) : (
              <>
                <div>
                  <h3 className="font-bold text-purple-300 mb-2">Organization Members ({inspectData.users.length})</h3>
                  <div className="space-y-1.5">
                    {inspectData.users.map((u: any) => (
                      <div key={u.membership_id} className="p-2.5 rounded-xl bg-[#14102E] border border-purple-900/50 flex justify-between">
                        <div>
                          <p className="font-bold text-white">{u.full_name} ({u.email})</p>
                          <p className="text-purple-300/70">{u.role_name} • {u.branch_name || "All Branches"}</p>
                        </div>
                        <span className="uppercase font-bold text-[10px] text-purple-200">{u.membership_status}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-purple-300 mb-2">Recent Activity (Audit Metadata)</h3>
                  <div className="space-y-1">
                    {inspectData.activity.slice(0, 10).map((a: any) => (
                      <div key={a.id} className="p-2 rounded-lg bg-[#14102E] text-[11px] flex justify-between">
                        <span>{a.action} ({a.entity_name})</span>
                        <span className="text-purple-400">{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
