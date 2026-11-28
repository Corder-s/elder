"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AI_SAFETY_NOTICE =
  "AI-extracted information may contain errors. Verify all information against the original document before saving it to an official resident record.";

export default function DocumentIntelligencePage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [formType, setFormType] = useState("resident_admission");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [jRes, dRes] = await Promise.all([
        fetch("/api/document-intelligence/jobs"),
        fetch("/api/documents?status=available"),
      ]);
      const jData = await jRes.json();
      const dData = await dRes.json();
      setJobs(jData.jobs || []);
      setDocs(dData.documents || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadJobDetail = async (jobId: string) => {
    setSelectedJobId(jobId);
    setMsg(null);
    const res = await fetch(`/api/document-intelligence/jobs/${jobId}/result`);
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Unable to load extraction result");
      setDetail(null);
      return;
    }
    setDetail(data);
    const fields = data.extraction?.extracted_fields || {};
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries<any>(fields)) {
      init[k] = v?.value !== null && v?.value !== undefined ? String(v.value) : "";
    }
    setEditedValues(init);
  };

  const enqueueDoc = async (documentId: string) => {
    setMsg(null);
    const res = await fetch("/api/document-intelligence/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Failed to queue document");
    else {
      setMsg("Document queued for OCR & extraction.");
      await loadAll();
    }
  };

  const saveReview = async () => {
    if (!selectedJobId) return;
    setMsg(null);
    const res = await fetch(`/api/document-intelligence/jobs/${selectedJobId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        editedFields: editedValues,
        verifiedFieldKeys: Object.keys(editedValues),
      }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Review save failed");
    else {
      setMsg("Human edits & field verifications saved.");
      await loadJobDetail(selectedJobId);
    }
  };

  const decide = async (decision: "approve" | "reject") => {
    if (!selectedJobId) return;
    setMsg(null);
    const res = await fetch(`/api/document-intelligence/jobs/${selectedJobId}/${decision}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNotes: `${decision}d via Document Intelligence Console` }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || `Failed to ${decision}`);
    else {
      setMsg(`Extraction ${decision}d.`);
      await loadAll();
      await loadJobDetail(selectedJobId);
    }
  };

  const generateForm = async () => {
    if (!selectedJobId) return;
    setMsg(null);
    const res = await fetch("/api/generated-forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: selectedJobId, formType }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Form generation failed");
    else setMsg(`Draft form "${data.form.title}" created. Open Forms to review and submit.`);
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/documents"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#17133A]">Document Intelligence</h1>
              <p className="text-[11px] text-[#686581]">OCR, classification & human review</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/forms"
              className="px-3 py-2 rounded-xl bg-[#F3E8FF] text-[#6D28D9] text-xs font-bold"
            >
              Digital Forms
            </Link>
            <button
              onClick={loadAll}
              className="p-2 rounded-xl bg-white border border-[#E8E1F5] text-[#6D28D9]"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{AI_SAFETY_NOTICE}</span>
        </div>

        {msg && (
          <div className="p-3 rounded-2xl bg-[#F3E8FF] text-xs font-semibold text-[#5B21B6]">
            {msg}
          </div>
        )}

        <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-2">
          <h2 className="text-xs font-black text-[#17133A] uppercase">Queue Available Document</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => enqueueDoc(d.id)}
                className="px-3 py-2 rounded-xl bg-[#FAF8FF] border border-[#E8E1F5] text-xs font-bold text-[#17133A] whitespace-nowrap hover:border-[#6D28D9] flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#6D28D9]" />
                {d.title}
              </button>
            ))}
            {docs.length === 0 && (
              <span className="text-xs text-[#686581]">No available vault documents to queue.</span>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-xs font-black text-[#17133A] uppercase">Processing Queue</h2>
          {loading ? (
            <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
              Loading processing queue...
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
              No OCR processing jobs queued yet.
            </div>
          ) : (
            jobs.map((j) => (
              <div
                key={j.id}
                onClick={() => loadJobDetail(j.id)}
                className={`p-4 rounded-3xl bg-white border shadow-card cursor-pointer flex items-center justify-between ${
                  selectedJobId === j.id ? "border-[#6D28D9]" : "border-[#E8E1F5]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#17133A]">{j.document_title}</p>
                    <p className="text-[11px] text-[#686581]">
                      {j.predicted_category ? `${j.predicted_category} (${Math.round((j.classification_confidence || 0) * 100)}%)` : j.current_step}
                    </p>
                  </div>
                </div>
                <Badge variant="purple" className="text-[10px] uppercase">
                  {j.status.replace("_", " ")}
                </Badge>
              </div>
            ))
          )}
        </div>

        {detail?.extraction && (
          <div className="p-5 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#17133A]">Side-by-Side Extraction Review</h3>
                <p className="text-[11px] text-[#686581]">
                  Category: {detail.extraction.predicted_category} • Confidence:{" "}
                  {Math.round(Number(detail.extraction.classification_confidence) * 100)}%
                </p>
              </div>
              <Badge variant="purple">{detail.job.status}</Badge>
            </div>

            {detail.extraction.prompt_injection_detected && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                Prompt-injection pattern detected in source text. Treated strictly as untrusted data.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] space-y-2">
                <p className="font-black text-[#17133A]">Extracted Source Text</p>
                <pre className="whitespace-pre-wrap text-[11px] text-[#686581] max-h-72 overflow-y-auto">
                  {detail.extraction.raw_text || "(No text extracted)"}
                </pre>
              </div>

              <div className="space-y-2.5">
                <p className="font-black text-[#17133A]">Structured Fields (Editable)</p>
                {Object.entries<any>(detail.extraction.extracted_fields || {}).map(([k, meta]) => (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-[#17133A]">{k}</span>
                      <span className="text-[#686581]">
                        {meta?.pageNumber ? `p.${meta.pageNumber}` : "absent"} •{" "}
                        {meta?.verified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <input
                      value={editedValues[k] ?? ""}
                      onChange={(e) => setEditedValues((prev) => ({ ...prev, [k]: e.target.value }))}
                      placeholder="null (not found in source)"
                      className="w-full px-3 py-1.5 rounded-xl border border-[#E8E1F5] text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E8E1F5]">
              <Button onClick={saveReview} variant="outline" className="rounded-xl text-xs font-bold">
                Save Human Edits
              </Button>
              <Button onClick={() => decide("approve")} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Extraction
              </Button>
              <Button onClick={() => decide("reject")} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold">
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>

            {detail.job.status === "approved" && (
              <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#E8E1F5] bg-white font-bold"
                >
                  <option value="resident_admission">New Resident Admission Form</option>
                  <option value="resident_profile">Resident Profile Form</option>
                  <option value="guardian_family">Guardian & Family Form</option>
                  <option value="emergency_contact">Emergency Contact Form</option>
                  <option value="rescue_registration">Rescue Case Registration Form</option>
                  <option value="document_verification">Document Verification Checklist</option>
                  <option value="medical_summary_review">Medical Document Summary (Clinician)</option>
                </select>
                <Button onClick={generateForm} className="rounded-xl bg-[#6D28D9] text-white text-xs font-bold">
                  Generate Digital Form Draft
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
