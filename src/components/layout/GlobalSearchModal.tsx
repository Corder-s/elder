"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, Users, Ambulance, ArrowRight } from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [residents, setResidents] = useState<any[]>([]);
  const [rescues, setRescues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResidents([]);
      setRescues([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [rRes, rcRes] = await Promise.all([
          fetch(`/api/residents?search=${encodeURIComponent(query)}`).catch(() => null),
          fetch(`/api/rescue-cases?search=${encodeURIComponent(query)}`).catch(() => null),
        ]);
        if (rRes && rRes.ok) {
          const d = await rRes.json();
          setResidents((d.residents || []).slice(0, 5));
        }
        if (rcRes && rcRes.ok) {
          const d = await rcRes.json();
          setRescues((d.rescueCases || []).slice(0, 5));
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#17133A]/50 backdrop-blur-xs p-4 pt-16">
      <div className="w-full max-w-md rounded-3xl bg-white border border-[#E8E1F5] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E8E1F5]">
          <Search className="h-4 w-4 text-[#6D28D9]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search residents or rescue cases..."
            className="flex-1 text-xs font-medium text-[#17133A] focus:outline-none"
          />
          <button type="button" onClick={onClose} className="text-[#686581] hover:text-[#17133A]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-3 space-y-3">
          {!query.trim() ? (
            <p className="text-center text-xs text-[#686581] py-6">
              Type a resident name, ID, or rescue case number...
            </p>
          ) : loading ? (
            <p className="text-center text-xs text-[#686581] py-6">Searching records...</p>
          ) : residents.length === 0 && rescues.length === 0 ? (
            <p className="text-center text-xs text-[#686581] py-6">No matching records found.</p>
          ) : (
            <>
              {residents.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-[#686581] px-2">Residents</p>
                  {residents.map((r) => (
                    <Link
                      key={r.id}
                      href="/residents"
                      onClick={onClose}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF8FF]"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-[#6D28D9]" />
                        <div>
                          <p className="text-xs font-bold text-[#17133A]">{r.full_name}</p>
                          <p className="text-[10px] text-[#686581]">{r.resident_number}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-[#686581]" />
                    </Link>
                  ))}
                </div>
              )}

              {rescues.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-[#686581] px-2">Rescue Cases</p>
                  {rescues.map((rc) => (
                    <Link
                      key={rc.id}
                      href="/rescue-cases"
                      onClick={onClose}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF8FF]"
                    >
                      <div className="flex items-center gap-2">
                        <Ambulance className="h-3.5 w-3.5 text-[#EA580C]" />
                        <div>
                          <p className="text-xs font-bold text-[#17133A]">{rc.person_identifier}</p>
                          <p className="text-[10px] text-[#686581]">{rc.case_number}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-[#686581]" />
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
