"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Plus,
  BedDouble,
  Heart,
  FileText,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

interface ResidentCardData {
  id: string;
  name: string;
  age: number;
  room: string;
  bed: string;
  residentId: string;
  status: "Active" | "Hospital" | "Leave";
  admissionDate: string;
  bloodGroup: string;
  condition: string;
  photoUrl: string;
}

const RESIDENTS_DATA: ResidentCardData[] = [
  {
    id: "res-01",
    name: "Mr. Ram Prasad",
    age: 72,
    room: "A-101",
    bed: "Bed-1",
    residentId: "RES-014",
    status: "Active",
    admissionDate: "12 Jan 2024",
    bloodGroup: "B+",
    condition: "Hypertension, Diabetes",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "res-02",
    name: "Smt. Shanti Devi",
    age: 78,
    room: "A-102",
    bed: "Bed-2",
    residentId: "RES-015",
    status: "Active",
    admissionDate: "18 Feb 2024",
    bloodGroup: "O+",
    condition: "Type 2 Diabetes, Arthritis",
    photoUrl: "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "res-03",
    name: "Mr. Mohan Lal",
    age: 76,
    room: "B-201",
    bed: "Bed-1",
    residentId: "RES-016",
    status: "Hospital",
    admissionDate: "05 Mar 2024",
    bloodGroup: "A+",
    condition: "Cardiac Observation at AIIMS",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "res-04",
    name: "Smt. Kamla Devi",
    age: 82,
    room: "A-103",
    bed: "Bed-1",
    residentId: "RES-017",
    status: "Active",
    admissionDate: "20 May 2024",
    bloodGroup: "AB+",
    condition: "Osteoarthritis, Mild Memory Loss",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  },
];

export default function ResidentsPage() {
  const [search, setSearch] = useState("");
  const [selectedResident, setSelectedResident] = useState<ResidentCardData | null>(null);
  const [profileTab, setProfileTab] = useState<"overview" | "medical" | "attendance" | "documents">("overview");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filtered = RESIDENTS_DATA.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.room.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="space-y-4">
        {/* If viewing a single profile, render Screen 2 (Resident Profile) */}
        {selectedResident ? (
          <div className="space-y-4">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedResident(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] hover:bg-[#F3E8FF]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="text-base font-bold text-[#17133A]">Resident Profile</h2>
              <div className="w-9" />
            </div>

            {/* Profile Header Card matching Reference 1 Screen 2 */}
            <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-[#6D28D9] shadow-soft shrink-0">
                  <img
                    src={selectedResident.photoUrl}
                    alt={selectedResident.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#17133A]">
                    {selectedResident.name}
                  </h3>
                  <p className="text-xs text-[#686581] mt-0.5">
                    Age: {selectedResident.age} Years • ID: {selectedResident.residentId}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded-full">
                Admitted
              </span>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-white border border-[#E8E1F5]">
              {(["overview", "medical", "attendance", "documents"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setProfileTab(tab)}
                  className={`py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                    profileTab === tab
                      ? "bg-[#6D28D9] text-white shadow-soft"
                      : "text-[#686581] hover:text-[#17133A]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab: Overview Details matching Reference 1 Screen 2 */}
            {profileTab === "overview" && (
              <Card>
                <CardContent className="p-4 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[#E8E1F5]">
                    <span className="text-[#686581] font-medium">Admission Date</span>
                    <span className="font-bold text-[#17133A]">{selectedResident.admissionDate}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#E8E1F5]">
                    <span className="text-[#686581] font-medium">Room / Bed</span>
                    <span className="font-bold text-[#6D28D9]">
                      {selectedResident.room} / {selectedResident.bed}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#E8E1F5]">
                    <span className="text-[#686581] font-medium">Blood Group</span>
                    <span className="font-bold text-[#17133A]">{selectedResident.bloodGroup}</span>
                  </div>

                  <div className="py-1">
                    <span className="text-[#686581] font-medium block mb-1">Primary Condition</span>
                    <span className="font-bold text-[#17133A] bg-[#FAF8FF] p-2.5 rounded-xl border border-[#E8E1F5] block">
                      {selectedResident.condition}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Button */}
            <Button size="lg" className="w-full rounded-2xl font-bold shadow-soft">
              Edit Details
            </Button>
          </div>
        ) : (
          /* Resident Listing Screen matching Reference 1 Screen 1 */
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[#17133A]">Residents</h2>
              <span className="text-xs font-bold text-[#6D28D9] bg-[#F3E8FF] px-2.5 py-1 rounded-full">
                {RESIDENTS_DATA.length} Total
              </span>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-[#686581] pointer-events-none" />
              <input
                type="text"
                placeholder="Search resident by name, room..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-white pl-10 pr-4 text-xs font-medium text-[#17133A] placeholder:text-[#686581]/70 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] shadow-2xs"
              />
            </div>

            {/* Residents Cards List matching Reference 1 Screen 1 */}
            <div className="space-y-3">
              {filtered.map((resident) => (
                <div
                  key={resident.id}
                  onClick={() => setSelectedResident(resident)}
                  className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9]/40 shadow-card flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full overflow-hidden border border-[#E8E1F5] shadow-2xs shrink-0">
                      <img
                        src={resident.photoUrl}
                        alt={resident.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#17133A]">
                        {resident.name}
                      </h4>
                      <p className="text-[11px] text-[#686581] mt-0.5">
                        Age: {resident.age} • Room: {resident.room}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      resident.status === "Active"
                        ? "bg-[#DCFCE7] text-[#16A34A]"
                        : "bg-[#FFE4E6] text-[#E11D48]"
                    }`}
                  >
                    {resident.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom Add Resident Button matching Reference 1 Screen 1 */}
            <div className="pt-2">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                size="lg"
                className="w-full rounded-2xl font-bold shadow-soft flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Resident</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Resident Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Resident"
        description="Register an elderly senior into Sri Seva Old Age Home."
      >
        <div className="space-y-3 text-xs">
          <input
            placeholder="Full Name"
            className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Age"
              className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
            />
            <input
              placeholder="Room Number (e.g. A-104)"
              className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
            />
          </div>
          <input
            placeholder="Primary Medical Condition"
            className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => setIsAddModalOpen(false)}>
              Save Record
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
