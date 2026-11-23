"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Ambulance,
  Search,
  Plus,
  MapPin,
  Clock,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

interface RescueCaseItem {
  id: string;
  caseNumber: string;
  name: string;
  age: string;
  status: "In Progress" | "Pending" | "Family Tracing" | "Admitted";
  location: string;
  photoUrl: string;
  reportedAt: string;
}

const RESCUE_DATA: RescueCaseItem[] = [
  {
    id: "rc-102",
    caseNumber: "RC-102",
    name: "Unidentified Male",
    age: "~70 yrs",
    status: "In Progress",
    location: "Near Hanuman Mandir, Connaught Place",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    reportedAt: "Today, 08:30 AM",
  },
  {
    id: "rc-103",
    caseNumber: "RC-103",
    name: "Smt. Unknown",
    age: "~65 yrs",
    status: "Pending",
    location: "Kashmere Gate Bus Stand, North Delhi",
    photoUrl: "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=150&auto=format&fit=crop&q=80",
    reportedAt: "Today, 11:15 AM",
  },
  {
    id: "rc-101",
    caseNumber: "RC-101",
    name: "Mr. Raghunath",
    age: "68 yrs",
    status: "Family Tracing",
    location: "Old Delhi Railway Station, Platform 3",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    reportedAt: "Yesterday",
  },
];

export default function RescueCasesPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filtered = RESCUE_DATA.filter((rc) => {
    if (activeFilter === "pending") return rc.status === "Pending";
    if (activeFilter === "progress") return rc.status === "In Progress";
    return true;
  });

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header matching Reference Image 1 Screen 3 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#17133A]">Rescue Cases</h2>
          <span className="text-xs font-bold text-[#6D28D9] bg-[#F3E8FF] px-2.5 py-1 rounded-full">
            {RESCUE_DATA.length} Total
          </span>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-[#686581] pointer-events-none" />
          <input
            type="text"
            placeholder="Search rescue case..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs font-medium text-[#17133A] placeholder:text-[#686581]/70 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] shadow-2xs"
          />
        </div>

        {/* Filter Pills matching Reference Image 1 Screen 3 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === "all"
                ? "bg-[#6D28D9] text-white shadow-soft"
                : "bg-white text-[#686581] border border-[#E8E1F5]"
            }`}
          >
            All (5)
          </button>
          <button
            onClick={() => setActiveFilter("pending")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === "pending"
                ? "bg-[#6D28D9] text-white shadow-soft"
                : "bg-white text-[#686581] border border-[#E8E1F5]"
            }`}
          >
            Pending (2)
          </button>
          <button
            onClick={() => setActiveFilter("progress")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === "progress"
                ? "bg-[#6D28D9] text-white shadow-soft"
                : "bg-white text-[#686581] border border-[#E8E1F5]"
            }`}
          >
            In Progress (2)
          </button>
        </div>

        {/* Rescue Cards matching Reference Image 1 Screen 3 */}
        <div className="space-y-3">
          {filtered.map((rc) => (
            <div
              key={rc.id}
              className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9]/40 shadow-card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full overflow-hidden border border-[#E8E1F5] shadow-2xs shrink-0 bg-purple-100">
                  <img
                    src={rc.photoUrl}
                    alt={rc.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#17133A]">
                    {rc.caseNumber}
                  </h4>
                  <p className="text-[11px] text-[#686581] mt-0.5">
                    {rc.name} • {rc.age}
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  rc.status === "In Progress"
                    ? "bg-[#FEF3C7] text-[#D97706]"
                    : rc.status === "Pending"
                    ? "bg-[#FFE4E6] text-[#E11D48]"
                    : "bg-[#F3E8FF] text-[#6D28D9]"
                }`}
              >
                {rc.status}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom New Rescue Case Button matching Reference 1 */}
        <div className="pt-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            size="lg"
            className="w-full rounded-2xl font-bold shadow-soft flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Rescue Case</span>
          </Button>
        </div>
      </div>

      {/* New Rescue Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Intake New Rescue Case"
        description="Record street rescue observations and location details."
      >
        <div className="space-y-3 text-xs">
          <input
            placeholder="Rescued Person Name (if known)"
            className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
          />
          <input
            placeholder="Approximate Age (e.g. 70 yrs)"
            className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
          />
          <input
            placeholder="Rescue Location Address / Landmark"
            className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => setIsAddModalOpen(false)}>
              Save Case
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
