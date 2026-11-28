"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { KeyRound, CheckCircle2, ArrowLeft, Building2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [inviteInfo, setInviteInfo] = useState<any | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadTokenPreview = async (tok: string) => {
    if (!tok.trim()) return;
    setLoadingInfo(true);
    setError(null);
    try {
      const res = await fetch(`/api/invitations/accept?token=${encodeURIComponent(tok.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setInviteInfo(null);
        setError(data.error || "Invalid invitation token");
        return;
      }
      setInviteInfo(data.invitation);
      if (data.invitation?.inviteeName) {
        setFullName(data.invitation.inviteeName);
      }
    } catch {
      setError("Unable to verify invitation token.");
    } finally {
      setLoadingInfo(false);
    }
  };

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
      loadTokenPreview(urlToken);
    }
  }, [searchParams]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), fullName, password, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invitation");
        return;
      }
      setSuccessMsg(data.message);
    } catch {
      setError("Network error while accepting invitation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] px-6 py-8 max-w-md mx-auto flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <Link href="/login" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-[#E8E1F5] text-[#17133A]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-3 py-1 rounded-full">
          Invitation Onboarding
        </span>
      </div>

      <div className="my-auto space-y-5 py-6">
        <div className="text-center flex flex-col items-center">
          <Logo size="md" showText={false} className="mb-3" />
          <h1 className="text-2xl font-black text-[#17133A]">Accept Organization Invitation</h1>
          <p className="text-xs text-[#686581] mt-1">
            Join your assigned NGO workspace with your one-time invitation token.
          </p>
        </div>

        {successMsg ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] shadow-card text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="text-xs font-semibold text-[#17133A]">{successMsg}</p>
            <Button onClick={() => router.push("/login")} className="w-full rounded-2xl bg-[#6D28D9] text-white font-bold text-xs">
              Proceed to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleAccept} className="p-6 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-4">
            {error && <div className="p-3 rounded-xl bg-[#FFE4E6] text-[#E11D48] text-xs font-semibold">{error}</div>}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#17133A] flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-[#6D28D9]" />
                <span>Invitation Token</span>
              </label>
              <div className="flex gap-2">
                <input
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste invitation token"
                  className="flex-1 h-11 rounded-2xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs font-mono"
                />
                <Button type="button" variant="outline" onClick={() => loadTokenPreview(token)} disabled={loadingInfo} className="rounded-2xl text-xs font-bold">
                  {loadingInfo ? "..." : "Verify"}
                </Button>
              </div>
            </div>

            {inviteInfo && (
              <div className="p-3.5 rounded-2xl bg-[#F3E8FF]/60 border border-[#DDD6FE] text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#4C1D95]">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{inviteInfo.organizationName}</span>
                </div>
                <p className="text-[#686581]">Email: <strong>{inviteInfo.email}</strong></p>
                <p className="text-[#686581]">Assigned Role: <strong>{inviteInfo.roleName}</strong></p>
                {inviteInfo.branchName && <p className="text-[#686581]">Branch: <strong>{inviteInfo.branchName}</strong></p>}
              </div>
            )}

            {(!inviteInfo || inviteInfo.requiresPasswordSetup) && (
              <>
                <input
                  required={!inviteInfo || inviteInfo.requiresPasswordSetup}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number (optional)"
                  className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs"
                />
                <input
                  type="password"
                  required={!inviteInfo || inviteInfo.requiresPasswordSetup}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set Strong Password (min 8 chars)"
                  className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs"
                />
              </>
            )}

            <Button type="submit" disabled={submitting} className="w-full h-11 rounded-2xl bg-[#6D28D9] text-white font-bold text-xs">
              {submitting ? "Activating Membership..." : "Accept Invitation & Join Organization"}
            </Button>
          </form>
        )}
      </div>

      <div className="text-center text-[10px] text-[#686581]">ElderCare OS • Secure Invitation Onboarding</div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8FF] flex items-center justify-center text-xs text-[#686581]">Loading invitation...</div>}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
