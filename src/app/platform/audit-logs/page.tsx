"use client";

import React, { useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/PlatformShell";

export default function PlatformAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform/billing")
      .then((r) => r.json())
      .then((d) => setLogs(d.auditLogs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PlatformShell title="Platform Audit Logs" subtitle="Administrative & billing governance actions">
      {loading ? (
        <div className="p-6 rounded-2xl bg-[#181339] border border-purple-900/40 text-xs text-purple-300">
          Loading audit logs...
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div key={log.id} className="p-4 rounded-2xl bg-[#181339] border border-purple-900/40 flex justify-between items-center gap-4">
              <div>
                <p className="text-xs font-bold text-white">{log.action}</p>
                <p className="text-[11px] text-purple-300">
                  {log.actor_email || "System"} • {log.resource_type}
                </p>
              </div>
              <span className="text-[11px] text-purple-300/70">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </PlatformShell>
  );
}
