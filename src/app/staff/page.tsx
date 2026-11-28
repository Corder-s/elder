"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Shield,
  Mail,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

export default function StaffPage() {
  const { hasPermission } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [selectedBranches, setSelectedBranches] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", roleId: "", branchId: "", message: "" });
  const [inviting, setInviting] = useState(false);

  const canManage = hasPermission("org:member:update") || hasPermission("org:member:invite");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const staffRes = await fetch("/api/staff");
      if (staffRes.ok) {
        const sData = await staffRes.json();
        setMembers(sData.staff || sData.members || []);
        setInvitations(sData.invitations || []);
      }
      if (canManage) {
        const reqRes = await fetch("/api/staff/registration-requests");
        if (reqRes.ok) {
          const rData = await reqRes.json();
          setRequests(rData.requests || []);
          setRoles(rData.roles || []);
          setBranches(rData.branches || []);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRequestAction = async (requestId: string, action: "approve" | "reject" | "suspend") => {
    setMsg(null);
    const assignedRoleId = selectedRoles[requestId] || roles[0]?.id;
    const assignedBranchId = selectedBranches[requestId] || "";
    const res = await fetch("/api/staff/registration-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        action,
        assignedRoleId: action === "approve" ? assignedRoleId : undefined,
        assignedBranchId: action === "approve" && assignedBranchId ? assignedBranchId : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Action failed");
    else {
      setMsg(`Registration request ${action}d.`);
      await loadAll();
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setInviting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteForm.name,
          email: inviteForm.email,
          roleId: inviteForm.roleId || roles[0]?.id,
          branchId: inviteForm.branchId || undefined,
          message: inviteForm.message || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data.error || "Failed to send invitation");
      else {
        setMsg(
          data.devInvitationToken
            ? `Invitation sent! Local invite token: ${data.devInvitationToken}`
            : "Invitation sent."
        );
        setInviteForm({ name: "", email: "", roleId: "", branchId: "", message: "" });
        await loadAll();
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setMsg(null);
    const res = await fetch(`/api/staff/${inviteId}`, { method: "DELETE" });
    if (res.ok) {
      setMsg("Invitation revoked.");
      await loadAll();
    }
  };

  const handleToggleMembership = async (memberId: string, currentStatus: string) => {
    setMsg(null);
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    const res = await fetch(`/api/staff/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Failed to update membership");
    else {
      setMsg(`Membership updated to ${nextStatus}.`);
      await loadAll();
    }
  };

  const filtered = members.filter((m) => {
    const name = (m.full_name || m.displayName || "").toLowerCase();
    const email = (m.email || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

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
              <h1 className="text-lg font-black text-[#17133A]">Staff & Role Approvals</h1>
              <p className="text-[11px] text-[#686581]">Active team members & registration approvals</p>
            </div>
          </div>
        </div>

        {msg && (
          <div className="p-3 rounded-2xl bg-[#F3E8FF] text-xs font-semibold text-[#5B21B6]">
            {msg}
          </div>
        )}

        {canManage && requests.length > 0 && (
          <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-[#17133A] uppercase">
              <UserPlus className="h-4 w-4 text-[#6D28D9]" />
              <span>Registration Requests ({requests.length})</span>
            </div>
            <div className="space-y-2.5">
              {requests.map((rr) => (
                <div key={rr.id} className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-[#17133A]">{rr.full_name}</p>
                      <p className="text-[11px] text-[#686581]">
                        {rr.email} • Requested: <strong className="text-[#6D28D9]">{rr.requested_account_type}</strong>
                      </p>
                    </div>
                    <Badge variant="purple" className="text-[10px] uppercase">
                      {rr.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {rr.status === "pending_approval" && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <select
                        value={selectedRoles[rr.id] || roles[0]?.id || ""}
                        onChange={(e) => setSelectedRoles((p) => ({ ...p, [rr.id]: e.target.value }))}
                        className="px-2.5 py-1.5 rounded-xl border border-[#E8E1F5] bg-white text-xs font-semibold"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedBranches[rr.id] || ""}
                        onChange={(e) => setSelectedBranches((p) => ({ ...p, [rr.id]: e.target.value }))}
                        className="px-2.5 py-1.5 rounded-xl border border-[#E8E1F5] bg-white text-xs font-semibold"
                      >
                        <option value="">All Branches</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => handleRequestAction(rr.id, "approve")}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestAction(rr.id, "reject")}
                        className="rounded-xl text-rose-600 text-xs font-bold"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search team member name or email..."
          icon={<Search className="h-4 w-4 text-[#686581]" />}
          className="h-11 rounded-2xl bg-white border-[#E8E1F5] text-xs"
        />

        {loading ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
            Loading team members...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
            No team members found.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center font-black">
                    {(m.full_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#17133A]">{m.full_name}</p>
                    <p className="text-[11px] text-[#686581] flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {m.email}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant="purple" className="text-[10px] uppercase">
                    <Shield className="h-3 w-3 mr-1" /> {m.role_name || m.role_slug}
                  </Badge>
                  <p className="text-[10px] text-[#686581] uppercase">{m.status}</p>
                  {canManage && (
                    <button
                      onClick={() => handleToggleMembership(m.id, m.status)}
                      className="text-[10px] font-bold text-[#6D28D9] hover:underline block ml-auto"
                    >
                      {m.status === "active" ? "Suspend" : "Reactivate"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canManage && (
          <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3">
            <h2 className="text-xs font-black text-[#17133A] uppercase tracking-wider">
              Invite Organization Member
            </h2>
            <form onSubmit={handleInviteSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                placeholder="Full Name"
                className="h-9 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-3"
              />
              <input
                required
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="Email Address *"
                className="h-9 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-3"
              />
              <select
                value={inviteForm.roleId || roles[0]?.id || ""}
                onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
                className="h-9 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-2.5"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <select
                value={inviteForm.branchId}
                onChange={(e) => setInviteForm({ ...inviteForm, branchId: e.target.value })}
                className="h-9 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-2.5"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <input
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                placeholder="Optional welcome message"
                className="h-9 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 sm:col-span-2"
              />
              <Button type="submit" disabled={inviting} className="sm:col-span-2 rounded-xl bg-[#6D28D9] text-white font-bold text-xs">
                {inviting ? "Sending..." : "Send Invitation"}
              </Button>
            </form>

            {invitations.length > 0 && (
              <div className="pt-2 space-y-1.5 border-t border-[#E8E1F5]">
                <p className="text-[11px] font-bold text-[#686581]">Pending Invitations ({invitations.length})</p>
                {invitations.map((inv) => (
                  <div key={inv.id} className="p-2.5 rounded-xl bg-[#FAF8FF] border border-[#E8E1F5] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#17133A]">{inv.invitee_name || inv.email}</p>
                      <p className="text-[11px] text-[#686581]">{inv.email} • {inv.role_name}</p>
                    </div>
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
