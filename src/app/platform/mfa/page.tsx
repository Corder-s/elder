"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  KeyRound,
  QrCode,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function PlatformMfaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/platform/login");
          return;
        }
        const data = await res.json();
        if (!data.session?.isPlatformAdmin) {
          router.push("/unauthorized");
          return;
        }
        if (data.session?.mfaVerified) {
          router.push("/platform/dashboard");
          return;
        }
        setMfaEnabled(Boolean(data.mfaEnabled));
      } catch {
        router.push("/platform/login");
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, [router]);

  const handleStartEnrollment = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start MFA enrollment");
      setQrDataUrl(data.qrDataUrl);
      setManualSecret(data.manualSecret);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = useRecovery ? { recoveryCode } : { code };
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      if (data.recoveryCodes && data.recoveryCodes.length > 0) {
        setRecoveryCodes(data.recoveryCodes);
      } else {
        router.push("/platform/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#110E26] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#110E26] text-white flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-md w-full bg-[#1B173B] border border-purple-900/50 rounded-3xl p-8 shadow-2xl shadow-purple-950/60 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] flex items-center justify-center mb-3 shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Platform Owner MFA</h1>
          <p className="text-xs text-purple-300/70 mt-1">
            {recoveryCodes
              ? "Save your single-use recovery codes securely"
              : mfaEnabled
              ? "Enter your 6-digit authenticator code to unlock the console"
              : "Enroll TOTP multi-factor authentication to protect Platform Control"}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {recoveryCodes ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#120F2E] border border-purple-900/70 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>MFA Activated Successfully</span>
              </div>
              <p className="text-[11px] text-purple-200/80">
                Store these one-time recovery codes in a secure password manager. Each code works once.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {recoveryCodes.map((rc) => (
                  <code
                    key={rc}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1B173B] border border-purple-800/50 text-center text-xs font-mono text-purple-200"
                  >
                    {rc}
                  </code>
                ))}
              </div>
            </div>
            <button
              onClick={() => router.push("/platform/dashboard")}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] font-bold text-sm flex items-center justify-center gap-2"
            >
              <span>Continue to Platform Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : !mfaEnabled && !qrDataUrl ? (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-[#120F2E] border border-purple-900/60 text-xs text-purple-200/80 leading-relaxed">
              Platform Owner accounts require TOTP Multi-Factor Authentication before accessing tenant telemetry or billing controls.
            </div>
            <button
              onClick={handleStartEnrollment}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] font-bold text-sm flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              <span>Generate Authenticator QR Code</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            {qrDataUrl && (
              <div className="p-4 rounded-2xl bg-white text-[#17133A] flex flex-col items-center space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="MFA TOTP QR Code" className="w-44 h-44 rounded-lg" />
                {manualSecret && (
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase text-[#686581] block">
                      Manual Key
                    </span>
                    <code className="text-[11px] font-mono text-[#6D28D9] break-all">
                      {manualSecret}
                    </code>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-300/80 mb-1.5">
                {useRecovery ? "Single-Use Recovery Code" : "6-Digit Authenticator Code"}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
                {useRecovery ? (
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    className="w-full bg-[#120F2E] border border-purple-900/80 rounded-xl pl-10 pr-4 py-3 text-sm font-mono tracking-wider text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                    required
                  />
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full bg-[#120F2E] border border-purple-900/80 rounded-xl pl-10 pr-4 py-3 text-sm font-mono tracking-[0.35em] text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                    required
                  />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Verify & Unlock Console <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {mfaEnabled && (
              <button
                type="button"
                onClick={() => {
                  setUseRecovery(!useRecovery);
                  setError(null);
                }}
                className="w-full text-xs text-purple-300/80 hover:text-white flex items-center justify-center gap-1.5 pt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {useRecovery ? "Use 6-digit authenticator app instead" : "Use a single-use recovery code"}
                </span>
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
