"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  KeyRound,
  Lock,
  MonitorSmartphone,
  Bell,
  Sliders,
  Building2,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Database,
  FileArchive,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

type SettingsSection =
  | "profile"
  | "personal"
  | "security"
  | "password"
  | "mfa"
  | "sessions"
  | "notifications"
  | "preferences"
  | "organization";

export default function SettingsPage() {
  const { user, currentRole, activeOrgName, hasPermission, logout } = useAuth();
  const [section, setSection] = useState<SettingsSection>("profile");
  const [sessions, setSessions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const canManageOrg = hasPermission("org:settings:read") || hasPermission("org:settings:update") || currentRole === "ngo_admin";

  const loadSessions = async () => {
    const res = await fetch("/api/auth/sessions");
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions || []);
    }
  };

  useEffect(() => {
    if (section === "sessions") {
      loadSessions();
    }
  }, [section]);

  const revokeSession = async (id: string) => {
    setMsg(null);
    const res = await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg("Session revoked.");
      await loadSessions();
    }
  };

  const revokeAll = async () => {
    setMsg(null);
    const res = await fetch("/api/auth/revoke-all-sessions", { method: "POST" });
    if (res.ok) {
      await logout();
    }
  };

  const navItems: Array<{ id: SettingsSection; label: string; icon: React.ElementType; visible?: boolean }> = [
    { id: "profile", label: "Profile", icon: User },
    { id: "personal", label: "Personal Information", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "password", label: "Password", icon: KeyRound },
    { id: "mfa", label: "MFA", icon: Lock },
    { id: "sessions", label: "Sessions", icon: MonitorSmartphone },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "preferences", label: "Preferences", icon: Sliders },
    { id: "organization", label: "Organization Settings", icon: Building2, visible: canManageOrg },
  ];

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-[#17133A]">Account & Settings</h1>
            <p className="text-[11px] text-[#686581]">Security, sessions & workspace preferences</p>
          </div>
        </div>

        {/* Left Sidebar + Right Content Layout */}
        <div className="grid grid-cols-12 gap-3 sm:gap-4 items-start">
          {/* LEFT Sidebar */}
          <aside className="col-span-4 md:sticky md:top-16 p-1.5 sm:p-2 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-1">
            {navItems
              .filter((item) => item.visible !== false)
              .map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSection(item.id);
                      setMsg(null);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold text-left transition-colors ${
                      active
                        ? "bg-[#6D28D9] text-white shadow-soft"
                        : "text-[#17133A] hover:bg-[#FAF8FF] hover:text-[#6D28D9]"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}

            <div className="pt-2 mt-2 border-t border-[#E8E1F5]">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold text-[#E11D48] hover:bg-[#FFE4E6] transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {/* RIGHT Content Panel */}
          <section className="col-span-8 p-4 sm:p-5 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-4 text-xs">
            {msg && (
              <div className="p-3 rounded-2xl bg-[#F3E8FF] text-[#5B21B6] font-semibold">
                {msg}
              </div>
            )}

            {section === "profile" && (
              <div className="space-y-3">
                <h2 className="text-sm font-black text-[#17133A]">Account Profile</h2>
                <div className="p-4 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] space-y-1">
                  <p className="font-black text-base text-[#17133A]">{user?.displayName || "User"}</p>
                  <p className="text-[#686581]">{user?.email}</p>
                  <p className="text-[#6D28D9] font-bold uppercase text-[11px]">
                    Role: {currentRole.replace("_", " ")} • {activeOrgName || "No active workspace"}
                  </p>
                </div>
              </div>
            )}

            {section === "personal" && (
              <div className="space-y-3">
                <h2 className="text-sm font-black text-[#17133A]">Personal Information</h2>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]">
                    <span className="text-[10px] text-[#686581] block">Full Name</span>
                    <span className="font-bold text-[#17133A]">{user?.displayName || "-"}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]">
                    <span className="text-[10px] text-[#686581] block">Email</span>
                    <span className="font-bold text-[#17133A]">{user?.email || "-"}</span>
                  </div>
                </div>
              </div>
            )}

            {section === "security" && (
              <div className="space-y-3">
                <h2 className="text-sm font-black text-[#17133A]">Security Overview</h2>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Server-side session verification and RBAC enforcement are active.</span>
                </div>
                <Button onClick={revokeAll} variant="outline" className="rounded-xl text-rose-600 font-bold text-xs">
                  Sign Out All Devices
                </Button>
              </div>
            )}

            {section === "password" && (
              <div className="space-y-3">
                <h2 className="text-sm font-black text-[#17133A]">Password Management</h2>
                <p className="text-[#686581]">
                  Reset your password via a secure one-time email token.
                </p>
                <Link href="/forgot-password">
                  <Button className="rounded-xl bg-[#6D28D9] text-white text-xs font-bold">
                    Reset Password
                  </Button>
                </Link>
              </div>
            )}

            {section === "mfa" && (
              <div className="space-y-3">
                <h2 className="text-sm font-black text-[#17133A]">Multi-Factor Authentication</h2>
                <p className="text-[#686581]">
                  TOTP MFA is strictly enforced for Platform Owner / Super Admin accounts.
                </p>
              </div>
            )}

            {section === "sessions" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-[#17133A]">Active Sessions</h2>
                  <button onClick={loadSessions} className="text-[#6D28D9] font-bold">
                    Refresh
                  </button>
                </div>
                {sessions.length === 0 ? (
                  <p className="text-[#686581]">No active session details available.</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-[#17133A]">
                            {s.deviceName || "Browser Session"} {s.isCurrent ? "(Current)" : ""}
                          </p>
                          <p className="text-[10px] text-[#686581]">
                            IP: {s.ipAddress || "unknown"} • Last active{" "}
                            {s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleString() : "recently"}
                          </p>
                        </div>
                        <button
                          onClick={() => revokeSession(s.id)}
                          className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-600 font-bold text-[11px]"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === "notifications" && (
              <div className="space-y-3">
                <h2 className="text-sm font-black text-[#17133A]">Notification Preferences</h2>
                <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]">
                  <span className="font-bold">Care & Dosage Alerts</span>
                  <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]">
                  <span className="font-bold">Critical SMS Escalations</span>
                  <input type="checkbox" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} />
                </label>
              </div>
            )}

            {section === "preferences" && (
              <div className="space-y-3">
                <h2 className="text-sm font-black text-[#17133A]">Workspace Preferences</h2>
                <p className="text-[#686581]">ElderCare OS v2.0 • Mobile-First SaaS Workspace</p>
              </div>
            )}

            {section === "organization" && canManageOrg && (
              <div className="space-y-3">
                <h2 className="text-sm font-black text-[#17133A]">Organization Administration</h2>
                <Link
                  href="/settings/billing"
                  className="p-3.5 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] flex items-center justify-between hover:border-[#6D28D9]"
                >
                  <div className="flex items-center gap-2.5">
                    <Database className="h-4 w-4 text-[#6D28D9]" />
                    <span className="font-bold text-[#17133A]">Subscription & Billing</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#686581]" />
                </Link>
                <Link
                  href="/settings/exports"
                  className="p-3.5 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] flex items-center justify-between hover:border-[#6D28D9]"
                >
                  <div className="flex items-center gap-2.5">
                    <FileArchive className="h-4 w-4 text-[#6D28D9]" />
                    <span className="font-bold text-[#17133A]">Data Portability & Exports</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#686581]" />
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
