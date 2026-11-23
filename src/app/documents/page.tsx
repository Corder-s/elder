"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderArchive,
  Search,
  UploadCloud,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Lock,
  DownloadCloud,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { dataService } from "@/services/mockDataService";
import { DocumentItem } from "@/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    dataService.getDocuments().then(setDocuments);
  }, []);

  const filtered = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h1 className="text-lg font-black text-[#17133A]">Documents</h1>
              <p className="text-[11px] text-[#686581]">Aadhaar, agreements & medical files</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white text-xs h-9 rounded-xl font-bold px-3 shadow-soft flex items-center gap-1.5"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload</span>
          </Button>
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search document title or category..."
          icon={<Search className="h-4 w-4 text-[#686581]" />}
          className="h-11 rounded-2xl bg-white border-[#E8E1F5] text-xs"
        />

        {/* Document Cards */}
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#6D28D9] font-black text-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#17133A]">
                      {doc.title}
                    </h3>
                    <p className="text-[11px] text-[#686581] capitalize">
                      {doc.category} • {(doc.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <Badge variant="purple" className="text-[10px] uppercase font-bold">
                  {doc.ocrStatus === "completed" ? "OCR Verified" : "Encrypted"}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#E8E1F5]/60 text-xs">
                <span className="text-[11px] text-[#686581] flex items-center gap-1">
                  <Lock className="h-3 w-3 text-[#16A34A]" />
                  <span>Linked: {doc.linkedEntityName || "Ashram Archives"}</span>
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#6D28D9] hover:underline"
                >
                  <DownloadCloud className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Modal */}
        <Modal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          title="Upload Encrypted Document"
        >
          <div className="space-y-4 pt-2">
            <div className="border-2 border-dashed border-[#E8E1F5] rounded-3xl p-6 text-center space-y-2 bg-[#FAF8FF]">
              <UploadCloud className="h-8 w-8 text-[#6D28D9] mx-auto" />
              <p className="text-xs font-bold text-[#17133A]">Drag & drop file or Browse</p>
              <p className="text-[10px] text-[#686581]">PDF, JPG, PNG up to 10MB</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#17133A]">Document Category</label>
              <select className="w-full h-10 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs font-semibold text-[#17133A]">
                <option>Aadhaar / Government ID</option>
                <option>Medical Prescription / Reports</option>
                <option>Signed Admission Deed</option>
                <option>Court / Police Authority Letter</option>
              </select>
            </div>

            <Button
              onClick={() => setIsUploadOpen(false)}
              className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold h-11 rounded-2xl"
            >
              Upload to Safe Storage
            </Button>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
