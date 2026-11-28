"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ShieldCheck, KeyRound, LogOut, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { PUBLIC_ACCOUNT_TYPES } from "@/lib/role-catalog";

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgSlug, setOrgSlug] = useState("");
  const [requestedRole, setRequestedRole] = useState("staff");
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqSuccess, setReqSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadState = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.pendingRequests || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const activePending = pendingRequests.find((r) => r.status === "pending_approval");

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError(null);
    setReqSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationSlug: orgSlug, requestedAccountType: requestedRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReqError(data.error || "Unable to submit access request");
        return;
      }
      setReqSuccess(`Access request submitted to ${data.organizationName}.`);
      await loadState();
    } catch {
      setReqError("Network error submitting access request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between px-6 py-10 max-w-md mx-auto text-center select-none">
      <div className="my-auto space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#F3E8FF] border border-[#E8E1F5] text-[#6D28D9] shadow-soft">
          <Clock className="h-10 w-10 text-[#6D28D9]" />
        </div>

        {loading ? (
          <p className="text-xs text-[#686581]">Checking organization membership...</p>
        ) : activePending ? (
          <>
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider bg-[#FEF3C7] px-3 py-1 rounded-full">
                Pending Approval
              </span>
              <h1 className="text-2xl font-black text-[#17133A] tracking-tight">
                Awaiting Administrator Approval
              </h1>
              <p className="text-xs text-[#686581] max-w-xs mx-auto leading-relaxed">
                Your organization access request is awaiting approval.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E8E1F5] shadow-card text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#686581]">Organization:</span>
                <span className="font-bold text-[#17133A]">{activePending.organization_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#686581]">Requested Role:</span>
                <span className="font-bold text-[#6D28D9] uppercase">{activePending.requested_account_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#686581]">Status:</span>
                <span className="font-bold text-[#D97706]">Pending Approval</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-3 py-1 rounded-full">
                Organization Membership Required
              </span>
              <h1 className="text-xl font-black text-[#17133A] tracking-tight">
                No Organization Linked
              </h1>
              <p className="text-xs text-[#686581] max-w-xs mx-auto leading-relaxed">
                Your account is not linked to an organization yet. Please contact your NGO Administrator or accept an organization invitation.
              </p>
              {user?.email && <p className="text-[11px] text-[#686581]">Signed in as {user.email}</p>}
            </div>

            <form onSubmit={handleRequestAccess} className="p-4 rounded-2xl bg-white border border-[#E8E1F5] shadow-card text-left text-xs space-y-3">
              <p className="font-bold text-[#17133A]">Request Access to Existing NGO</p>
              {reqError && <div className="p-2 rounded-xl bg-[#FFE4E6] text-[#E11D48] font-semibold">{reqError}</div>}
              {reqSuccess && <div className="p-2 rounded-xl bg-[#DCFCE7] text-[#16A34A] font-semibold">{reqSuccess}</div>}
              <input
                required
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="Organization Code / Slug (e.g. sri-seva)"
                className="w-full h-10 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs"
              />
              <select
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs"
              >
                {PUBLIC_ACCOUNT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <Button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#6D28D9] text-white font-bold text-xs flex items-center justify-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Submitting..." : "Submit Access Request"}
              </Button>
            </form>
          </>
        )}

        <div className="p-3.5 rounded-2xl bg-[#F3E8FF]/60 border border-[#E8E1F5] text-left text-[11px] text-[#4C1D95] space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#6D28D9]" />
            <span>Multi-Tenant Isolation Active</span>
          </div>
          <p className="text-[#686581] leading-relaxed">
            Workspace access and resident records remain locked until an NGO Administrator approves your membership or you accept a valid invitation.
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          <Link href="/accept-invitation" className="block">
            <Button variant="outline" className="w-full rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
              <KeyRound className="h-4 w-4 text-[#6D28D9]" />
              Accept Organization Invitation
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            onClick={() => logout()}
            className="w-full rounded-2xl text-xs font-bold text-[#E11D48] flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="text-[10px] text-[#686581]/70">ElderCare OS • Secure Onboarding</div>
    </div>
  );
}
