"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Ambulance, FolderLock, ArrowRight, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { DEV_FIXTURE_RESIDENTS, DEV_FIXTURE_RESCUES } from "@/services/fixtures";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredResidents = query
    ? DEV_FIXTURE_RESIDENTS.filter(
        (r) =>
          r.fullName.toLowerCase().includes(query.toLowerCase()) ||
          r.residentNumber.toLowerCase().includes(query.toLowerCase())
      )
    : DEV_FIXTURE_RESIDENTS.slice(0, 3);

  const filteredRescues = query
    ? DEV_FIXTURE_RESCUES.filter(
        (rc) =>
          rc.rescueNumber.toLowerCase().includes(query.toLowerCase()) ||
          rc.personName?.toLowerCase().includes(query.toLowerCase())
      )
    : DEV_FIXTURE_RESCUES.slice(0, 2);

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-0 overflow-hidden">
      {/* Search Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <Search className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search resident name, ID, rescue case, or document..."
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          autoFocus
        />
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Results List */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
        {/* Residents Category */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <Users className="h-3.5 w-3.5" />
            <span>Residents</span>
          </div>
          <div className="space-y-1">
            {filteredResidents.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelect(`/residents`)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {r.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ID: {r.residentNumber} • {r.roomNumber || "No room assigned"}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Rescue Cases Category */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <Ambulance className="h-3.5 w-3.5" />
            <span>Rescue Cases</span>
          </div>
          <div className="space-y-1">
            {filteredRescues.map((rc) => (
              <div
                key={rc.id}
                onClick={() => handleSelect(`/rescue-cases`)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {rc.rescueNumber}: {rc.personName || "Unidentified"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Status: {rc.caseStatus.replace("_", " ")} • {rc.location.addressText}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 flex justify-between">
        <span>Tip: Press ESC to close search</span>
        <span>ElderCare OS v1.0</span>
      </div>
    </Modal>
  );
}

