"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, DownloadCloud, PackageCheck, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export default function TenantDataExportsPage() {
  const [exportsList, setExportsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [format, setFormat] = useState<"zip" | "json">("zip");
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exports");
      const data = await res.json();
      setExportsList(data.exports || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const requestExport = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportFormat: format, includeDocuments: includeDocs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export request failed");
      setMsg("Export job queued. Run the export worker or wait for background processing.");
      await load();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadExport = async (jobId: string) => {
    setMsg(null);
    const res = await fetch(`/api/exports/${jobId}/download-url`);
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Download failed");
      return;
    }
    window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#17133A]">Data Portability & Exports</h1>
              <p className="text-[11px] text-[#686581]">NGO-controlled full data & document archive</p>
            </div>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-xl bg-white border border-[#E8E1F5] text-[#6D28D9]"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3 text-xs">
          <div className="flex items-center gap-2 font-black text-[#17133A]">
            <PackageCheck className="h-4 w-4 text-[#6D28D9]" />
            <span>Request Organization Data Export</span>
          </div>
          <p className="text-[#686581]">
            Exports residents, medical records, prescriptions, finance, operational logs, and authorized vault documents. Passwords, MFA secrets, and platform credentials are excluded.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "zip" | "json")}
              className="px-3 py-2 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] font-bold"
            >
              <option value="zip">ZIP (JSON + CSV + Documents)</option>
              <option value="json">JSON Only</option>
            </select>
            <label className="flex items-center gap-1.5 font-semibold">
              <input
                type="checkbox"
                checked={includeDocs}
                onChange={(e) => setIncludeDocs(e.target.checked)}
              />
              Include Document Files
            </label>
            <Button
              disabled={busy}
              onClick={requestExport}
              className="rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs"
            >
              {busy ? "Queueing..." : "Request Export"}
            </Button>
          </div>
          {msg && (
            <div className="p-3 rounded-2xl bg-[#F3E8FF] text-[#5B21B6] font-semibold">{msg}</div>
          )}
        </div>

        <div className="space-y-2.5">
          {loading ? (
            <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
              Loading export history...
            </div>
          ) : exportsList.length === 0 ? (
            <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
              No export jobs requested yet.
            </div>
          ) : (
            exportsList.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between gap-3"
              >
                <div className="text-xs">
                  <p className="font-black text-[#17133A] uppercase">
                    {job.export_format} Export • {job.status}
                  </p>
                  <p className="text-[11px] text-[#686581]">
                    {job.current_step} ({job.progress_percent}%)
                    {job.file_size_bytes ? ` • ${(job.file_size_bytes / 1024).toFixed(1)} KB` : ""}
                  </p>
                  {job.sha256_checksum && (
                    <p className="text-[10px] text-[#686581] font-mono truncate max-w-xs">
                      SHA256: {job.sha256_checksum}
                    </p>
                  )}
                </div>
                {job.status === "completed" && (
                  <Button
                    size="sm"
                    onClick={() => downloadExport(job.id)}
                    className="rounded-xl bg-[#F3E8FF] text-[#6D28D9] hover:bg-[#E9D5FF] text-xs font-bold"
                  >
                    <DownloadCloud className="h-3.5 w-3.5 mr-1" /> Download
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
