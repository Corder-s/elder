"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Settings,
  Bell,
  Shield,
  Moon,
  Building,
  KeyRound,
  ArrowLeft,
  ChevronRight,
  Database,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#17133A]">Settings</h1>
              <p className="text-[11px] text-[#686581]">System configuration & preferences</p>
            </div>
          </div>
          <Badge variant="purple" className="px-2.5 py-1">
            v2.0 Mobile
          </Badge>
        </div>

        {/* Organization Info Card */}
        <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#6D28D9] font-black text-base shadow-soft">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#17133A]">
                Sri Seva Old Age Home
              </h3>
              <p className="text-[11px] text-[#686581]">
                Main Ashram Campus • Reg: NGO/DEL/2018/88
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E8E1F5]/60">
            <div className="p-2.5 rounded-xl bg-[#FAF8FF]">
              <span className="text-[10px] text-[#686581] block">License Status</span>
              <span className="font-bold text-[#16A34A] text-[11px] flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Active 80G Certified</span>
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF8FF]">
              <span className="text-[10px] text-[#686581] block">Total Beds</span>
              <span className="font-bold text-[#6D28D9] text-[11px]">86 Occupied / 100</span>
            </div>
          </div>
        </div>

        {/* System Settings List */}
        <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3">
          <h3 className="text-xs font-black text-[#17133A] uppercase tracking-wider">
            Operational Alerts
          </h3>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
              <Bell className="h-4 w-4 text-[#6D28D9]" />
              <div>
                <p className="text-xs font-bold text-[#17133A]">Medicine & Dose Alerts</p>
                <p className="text-[10px] text-[#686581]">Push alerts 15m before dosage</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
              className="h-4 w-4 accent-[#6D28D9] rounded"
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-[#E8E1F5]/60">
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-4 w-4 text-[#6D28D9]" />
              <div>
                <p className="text-xs font-bold text-[#17133A]">Family SMS Updates</p>
                <p className="text-[10px] text-[#686581]">Auto-notify vitals to guardians</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={smsAlerts}
              onChange={() => setSmsAlerts(!smsAlerts)}
              className="h-4 w-4 accent-[#6D28D9] rounded"
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-[#E8E1F5]/60">
            <div className="flex items-center gap-2.5">
              <Database className="h-4 w-4 text-[#6D28D9]" />
              <div>
                <p className="text-xs font-bold text-[#17133A]">Offline First Cache</p>
                <p className="text-[10px] text-[#686581]">Store records for offline rounds</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={offlineSync}
              onChange={() => setOfflineSync(!offlineSync)}
              className="h-4 w-4 accent-[#6D28D9] rounded"
            />
          </div>
        </div>

        {/* Security & Access */}
        <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-2">
          <h3 className="text-xs font-black text-[#17133A] uppercase tracking-wider mb-1">
            Security & Compliance
          </h3>

          <Link
            href="/role-selection"
            className="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF8FF] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-[#6D28D9]" />
              <span className="text-xs font-bold text-[#17133A]">Review Assigned Role</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#686581]" />
          </Link>

          <Link
            href="/forgot-password"
            className="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF8FF] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-4 w-4 text-[#6D28D9]" />
              <span className="text-xs font-bold text-[#17133A]">Change Account Password</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#686581]" />
          </Link>
        </div>

        <ActiveSessionsPanel />
      </div>
    </AppShell>
  );
}

function ActiveSessionsPanel() {
  const [sessions, setSessions] = React.useState<Array<{
    id: string;
    deviceName: string;
    ipAddress: string | null;
    isCurrent: boolean;
    lastActiveAt: string;
  }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

  const loadSessions = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // Ignore if unauthenticated in preview mode
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevokeOne = async (id: string) => {
    const res = await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setStatusMsg("Session revoked.");
      loadSessions();
    }
  };

  const handleRevokeAll = async () => {
    const res = await fetch("/api/auth/revoke-all-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepCurrent: false }),
    });
    if (res.ok) {
      window.location.href = "/login";
    }
  };

  return (
    <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-[#17133A] uppercase tracking-wider">
            Active Sessions
          </h3>
          <p className="text-[10px] text-[#686581]">
            Manage signed-in devices and revoke remote access
          </p>
        </div>
        <Button
          type="button"
          onClick={handleRevokeAll}
          className="h-8 px-3 rounded-xl bg-[#FFE4E6] text-[#E11D48] hover:bg-[#FECDD3] text-[11px] font-bold"
        >
          Logout All Devices
        </Button>
      </div>

      {statusMsg && (
        <p className="text-[11px] font-semibold text-[#16A34A]">{statusMsg}</p>
      )}

      {loading ? (
        <p className="text-xs text-[#686581]">Loading active sessions...</p>
      ) : sessions.length === 0 ? (
        <p className="text-xs text-[#686581]">No active server sessions found.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]"
            >
              <div>
                <p className="text-xs font-bold text-[#17133A] flex items-center gap-1.5">
                  <span>{s.deviceName}</span>
                  {s.isCurrent && (
                    <Badge variant="purple" className="text-[9px] px-1.5 py-0">
                      Current
                    </Badge>
                  )}
                </p>
                <p className="text-[10px] text-[#686581]">
                  IP: {s.ipAddress || "Unknown"} • Last active{" "}
                  {new Date(s.lastActiveAt).toLocaleString()}
                </p>
              </div>
              {!s.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRevokeOne(s.id)}
                  className="text-[11px] font-bold text-[#E11D48] hover:underline"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
