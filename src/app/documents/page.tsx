"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  UploadCloud,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Lock,
  DownloadCloud,
  Eye,
  Archive,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface VaultDocument {
  id: string;
  title: string;
  documentType: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  isConfidential: boolean;
  documentStatus: string;
  scanStatus: string;
  sha256Checksum: string | null;
  residentId: string | null;
  residentName: string | null;
  uploaderName: string | null;
  createdAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [residents, setResidents] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Upload state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploadResidentId, setUploadResidentId] = useState("");
  const [uploadConfidential, setUploadConfidential] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preview state
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    fileName: string;
    mimeType: string;
  } | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const qs = new URLSearchParams();
      if (searchQuery.trim()) qs.set("q", searchQuery.trim());
      if (categoryFilter !== "all") qs.set("documentType", categoryFilter);
      if (statusFilter !== "all") qs.set("status", statusFilter);

      const res = await fetch(`/api/documents?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load documents");
      setDocuments(data.documents || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to fetch documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    fetch("/api/residents")
      .then((r) => (r.ok ? r.json() : { residents: [] }))
      .then((d) => setResidents(d.residents || []))
      .catch(() => {});
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a PDF, JPEG, PNG, or WebP file.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadProgress(10);

    try {
      // 1. Request upload intent & presigned URL
      const intentRes = await fetch("/api/documents/upload-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle.trim() || selectedFile.name,
          documentType: uploadCategory,
          fileName: selectedFile.name,
          fileSizeBytes: selectedFile.size,
          mimeType: selectedFile.type,
          residentId: uploadResidentId || null,
          isConfidential: uploadConfidential,
        }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok) {
        throw new Error(intentData.error || "Upload initiation failed");
      }
      setUploadProgress(35);

      // 2. Direct upload to private S3 storage
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", intentData.uploadUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setUploadProgress(35 + Math.round((evt.loaded / evt.total) * 45));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Storage upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Network error uploading to private storage"));
        xhr.send(selectedFile);
      });

      setUploadProgress(85);

      // 3. Complete & verify upload
      const compRes = await fetch(`/api/documents/${intentData.document.id}/complete-upload`, {
        method: "POST",
      });
      const compData = await compRes.json();
      if (!compRes.ok) {
        throw new Error(compData.error || "Upload verification failed");
      }

      setUploadProgress(100);
      setIsUploadOpen(false);
      setUploadTitle("");
      setSelectedFile(null);
      setUploadResidentId("");
      setUploadConfidential(false);
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSecureDownload = async (doc: VaultDocument, preview = false) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/download-url`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Download authorization failed");
      if (preview) {
        setPreviewDoc({
          url: data.downloadUrl,
          fileName: data.fileName,
          mimeType: data.mimeType,
        });
      } else {
        window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleArchive = async (doc: VaultDocument) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", reason: "Archived via Document Vault" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Archive failed");
      await loadDocuments();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

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
              <h1 className="text-lg font-black text-[#17133A]">Document Vault</h1>
              <p className="text-[11px] text-[#686581]">Private encrypted tenant storage</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/documents/intelligence"
              className="px-3 py-2 rounded-xl bg-[#F3E8FF] text-[#6D28D9] text-xs font-bold"
            >
              AI OCR
            </Link>
            <Button
              size="sm"
              onClick={() => {
                setUploadError(null);
                setUploadProgress(0);
                setIsUploadOpen(true);
              }}
              className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white text-xs h-9 rounded-xl font-bold px-3 shadow-soft flex items-center gap-1.5"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search document title or filename..."
            icon={<Search className="h-4 w-4 text-[#686581]" />}
            className="h-11 rounded-2xl bg-white border-[#E8E1F5] text-xs"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", "aadhaar", "medical", "agreement", "rescue", "general"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize whitespace-nowrap ${
                  categoryFilter === cat
                    ? "bg-[#6D28D9] text-white"
                    : "bg-white border border-[#E8E1F5] text-[#686581]"
                }`}
              >
                {cat}
              </button>
            ))}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E8E1F5] text-[11px] font-bold text-[#17133A]"
            >
              <option value="all">All Active</option>
              <option value="available">Available</option>
              <option value="pending_scan">Pending Scan</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
            Loading documents from vault...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-6 rounded-3xl bg-white border border-[#E8E1F5] text-center text-xs text-[#686581]">
            No documents found matching your filters.
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#6D28D9] font-black text-sm shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-black text-[#17133A]">{doc.title}</h3>
                        {doc.isConfidential && <Lock className="h-3.5 w-3.5 text-amber-600" />}
                      </div>
                      <p className="text-[11px] text-[#686581] capitalize">
                        {doc.documentType} • {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                        {doc.residentName ? ` • ${doc.residentName}` : ""}
                      </p>
                      <p className="text-[10px] text-[#686581]">
                        Uploaded {new Date(doc.createdAt).toLocaleDateString("en-IN")}
                        {doc.uploaderName ? ` by ${doc.uploaderName}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant="purple" className="text-[10px] uppercase font-bold">
                    {doc.documentStatus.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E8E1F5]/60 text-xs">
                  <span className="text-[11px] text-[#686581] flex items-center gap-1">
                    {doc.documentStatus === "available" ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Verified</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span>{doc.scanStatus}</span>
                      </>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    {doc.documentStatus === "available" && (
                      <>
                        <button
                          onClick={() => handleSecureDownload(doc, true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF8FF] border border-[#E8E1F5] text-[11px] font-bold text-[#17133A]"
                        >
                          <Eye className="h-3.5 w-3.5" /> Preview
                        </button>
                        <button
                          onClick={() => handleSecureDownload(doc, false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F3E8FF] text-[11px] font-bold text-[#6D28D9]"
                        >
                          <DownloadCloud className="h-3.5 w-3.5" /> Download
                        </button>
                      </>
                    )}
                    {doc.documentStatus !== "archived" && (
                      <button
                        onClick={() => handleArchive(doc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-[11px] font-bold text-slate-700"
                      >
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload to Private Vault">
          <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
            {uploadError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                {uploadError}
              </div>
            )}
            <div>
              <label className="font-bold text-[#17133A] block mb-1">Document Title</label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g., Aadhaar Card or Medical Summary"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#17133A] block mb-1">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E8E1F5] bg-white"
                >
                  <option value="general">General</option>
                  <option value="aadhaar">Aadhaar / ID</option>
                  <option value="medical">Medical</option>
                  <option value="agreement">Agreement</option>
                  <option value="rescue">Rescue Case</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-[#17133A] block mb-1">Resident (Optional)</label>
                <select
                  value={uploadResidentId}
                  onChange={(e) => setUploadResidentId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E8E1F5] bg-white"
                >
                  <option value="">None / Org-wide</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="font-bold text-[#17133A] block mb-1">
                File (PDF, JPEG, PNG, WebP)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs"
                required
              />
            </div>
            <label className="flex items-center gap-2 font-semibold text-[#17133A]">
              <input
                type="checkbox"
                checked={uploadConfidential}
                onChange={(e) => setUploadConfidential(e.target.checked)}
              />
              Mark as Confidential (Doctor / Admin / Accountant only)
            </label>
            {uploading && (
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-[#F3E8FF] overflow-hidden">
                  <div
                    className="h-full bg-[#6D28D9] transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#686581]">Uploading & verifying... {uploadProgress}%</p>
              </div>
            )}
            <Button
              type="submit"
              disabled={uploading}
              className="w-full bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold rounded-xl"
            >
              {uploading ? "Uploading..." : "Upload Securely"}
            </Button>
          </form>
        </Modal>

        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc?.fileName || "Document Preview"}
        >
          {previewDoc && (
            <div className="space-y-3">
              {previewDoc.mimeType.startsWith("image/") ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.fileName}
                  className="max-h-96 w-full object-contain rounded-xl border border-[#E8E1F5]"
                />
              ) : (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.fileName}
                  className="w-full h-96 rounded-xl border border-[#E8E1F5]"
                />
              )}
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6D28D9]"
              >
                <DownloadCloud className="h-4 w-4" /> Open / Download Original
              </a>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
