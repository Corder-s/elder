"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Ambulance, Search, Plus, ArrowLeft, MapPin, RefreshCw, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface RescueCaseItem {
  id: string;
  case_number: string;
  person_identifier: string;
  approximate_age: number | null;
  gender: string;
  rescue_location: string;
  urgency_level: string;
  status: string;
  current_health_status: string | null;
  admitted_resident_id: string | null;
}

export default function RescueCasesPage() {
  const [cases, setCases] = useState<RescueCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [personIdentifier, setPersonIdentifier] = useState("");
  const [gender, setGender] = useState("male");
  const [rescueLocation, setRescueLocation] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== "all") params.set("status", activeFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/rescue-cases?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load rescue cases");
      setCases(data.rescueCases || []);
    } catch (err: any) {
      setError(err.message || "Unable to load rescue cases");
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rescue-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIdentifier, gender, rescueLocation, urgencyLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register rescue case");
      setIsAddModalOpen(false);
      setPersonIdentifier("");
      setRescueLocation("");
      loadCases();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/rescue-cases/${id}/convert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert rescue case");
      loadCases();
    } catch (err: any) {
      setError(err.message);
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
              <h1 className="text-lg font-black text-[#17133A]">Rescue Cases</h1>
              <p className="text-[11px] text-[#686581]">Field dispatch &amp; admission intake</p>
            </div>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-3 rounded-xl bg-[#6D28D9] text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Rescue</span>
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#686581]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search case, location, or person..."
              className="h-10 pl-9 rounded-2xl border-[#E8E1F5] bg-white text-xs"
            />
          </div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="h-10 rounded-2xl border border-[#E8E1F5] bg-white px-3 text-xs font-semibold text-[#17133A]"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="under_assessment">Assessment</option>
            <option value="hospitalized">Hospitalized</option>
            <option value="admitted">Admitted</option>
          </select>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={loadCases} className="font-bold underline flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-[#686581]">Loading rescue cases...</div>
        ) : cases.length === 0 ? (
          <EmptyState
            icon={<Ambulance className="h-6 w-6" />}
            title="No rescue cases found"
            description="No active or historical rescue cases match your filter."
          />
        ) : (
          <div className="space-y-3">
            {cases.map((rc) => (
              <div
                key={rc.id}
                className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-[#6D28D9]">{rc.case_number}</span>
                    <h3 className="text-sm font-black text-[#17133A]">{rc.person_identifier}</h3>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge variant={rc.urgency_level === "critical" || rc.urgency_level === "high" ? "danger" : "purple"}>
                      {rc.urgency_level}
                    </Badge>
                    <Badge variant="outline">{rc.status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-[#686581] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#6D28D9]" />
                  <span>{rc.rescue_location}</span>
                </p>
                {!rc.admitted_resident_id && rc.status !== "admitted" && (
                  <Button
                    onClick={() => handleConvert(rc.id)}
                    className="w-full h-9 rounded-xl bg-[#F3E8FF] text-[#6D28D9] hover:bg-[#E8E1F5] text-xs font-bold"
                  >
                    Convert to Resident Admission
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Rescue Case">
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              required
              value={personIdentifier}
              onChange={(e) => setPersonIdentifier(e.target.value)}
              placeholder="Person name / identifier"
            />
            <Input
              required
              value={rescueLocation}
              onChange={(e) => setRescueLocation(e.target.value)}
              placeholder="Rescue location / landmark"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="h-10 rounded-xl border border-[#E8E1F5] px-3 text-xs"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value)}
                className="h-10 rounded-xl border border-[#E8E1F5] px-3 text-xs"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-[#6D28D9] text-white rounded-xl h-10 text-xs font-bold">
              {submitting ? "Saving..." : "Submit Rescue Case"}
            </Button>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
