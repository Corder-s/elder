"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileCheck2, Send } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function GeneratedFormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generated-forms");
      const data = await res.json();
      setForms(data.forms || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openForm = (f: any) => {
    setSelected(f);
    setFormData(f.form_data || {});
    setMsg(null);
  };

  const saveDraft = async (markReviewed = false) => {
    if (!selected) return;
    setMsg(null);
    const res = await fetch(`/api/generated-forms/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formData,
        status: markReviewed ? "reviewed" : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Save failed");
    else {
      setMsg(markReviewed ? "Draft marked reviewed." : "Draft saved.");
      setSelected(data.form);
      await load();
    }
  };

  const submitForm = async () => {
    if (!selected) return;
    setMsg(null);
    const res = await fetch(`/api/generated-forms/${selected.id}/submit`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Submission failed");
    else {
      setMsg(`Submitted to ${data.targetEntityType} (${data.targetEntityId}).`);
      setSelected(data.form);
      await load();
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/documents/intelligence"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#17133A]">Digital Forms</h1>
              <p className="text-[11px] text-[#686581]">Draft review & authorized operational submission</p>
            </div>
          </div>
        </div>

        {msg && (
          <div className="p-3 rounded-2xl bg-[#F3E8FF] text-xs font-semibold text-[#5B21B6]">
            {msg}
          </div>
        )}

        <div className="space-y-2.5">
          {loading ? (
            <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
              Loading generated form drafts...
            </div>
          ) : forms.length === 0 ? (
            <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
              No form drafts generated yet. Approve a document in Document Intelligence first.
            </div>
          ) : (
            forms.map((f) => (
              <div
                key={f.id}
                onClick={() => openForm(f)}
                className={`p-4 rounded-3xl bg-white border shadow-card cursor-pointer flex items-center justify-between ${
                  selected?.id === f.id ? "border-[#6D28D9]" : "border-[#E8E1F5]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#17133A]">{f.title}</p>
                    <p className="text-[11px] text-[#686581]">
                      v{f.form_version} • Source: {f.source_document_title || "Manual"}
                    </p>
                  </div>
                </div>
                <Badge variant="purple" className="text-[10px] uppercase">
                  {f.status}
                </Badge>
              </div>
            ))
          )}
        </div>

        {selected && (
          <div className="p-5 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3 text-xs">
            <h2 className="text-sm font-black text-[#17133A]">{selected.title}</h2>
            {(selected.schema_definition?.fields || []).map((field: any) => (
              <div key={field.key} className="space-y-1">
                <label className="font-bold text-[#17133A] block">
                  {field.label} {field.required && <span className="text-rose-500">*</span>}
                </label>
                {field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(formData[field.key])}
                    disabled={selected.status === "submitted"}
                    onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.checked }))}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={formData[field.key] ?? ""}
                    disabled={selected.status === "submitted"}
                    onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E1F5] bg-white"
                  >
                    <option value="">Select...</option>
                    {(field.options || []).map((o: string) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    value={formData[field.key] ?? ""}
                    disabled={selected.status === "submitted"}
                    onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E1F5]"
                  />
                )}
              </div>
            ))}

            {selected.status !== "submitted" && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={() => saveDraft(false)} className="rounded-xl text-xs font-bold">
                  Save Draft
                </Button>
                <Button variant="outline" onClick={() => saveDraft(true)} className="rounded-xl text-xs font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Reviewed
                </Button>
                <Button onClick={submitForm} className="rounded-xl bg-[#6D28D9] text-white text-xs font-bold">
                  <Send className="h-3.5 w-3.5 mr-1" /> Submit to Official Records
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
