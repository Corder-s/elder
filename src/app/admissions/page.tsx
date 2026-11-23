"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  BedDouble,
  ChevronRight,
  Filter,
  ArrowLeft,
  Building,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { dataService } from "@/services/mockDataService";
import { Admission } from "@/types";
import { formatDate } from "@/lib/utils";

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState("Room 105");
  const [targetBed, setTargetBed] = useState("Bed 105-A");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    dataService.getAdmissions().then(setAdmissions);
  }, []);

  const handleApprove = () => {
    if (!selectedAdmission) return;
    const updated = admissions.map((a) =>
      a.id === selectedAdmission.id
        ? {
            ...a,
            applicationStatus: "approved" as any,
            allocatedRoomNumber: targetRoom,
            allocatedBedCode: targetBed,
            reviewedAt: new Date().toISOString(),
            reviewedBy: "Admin",
          }
        : a
    );
    setAdmissions(updated);
    setIsApprovalModalOpen(false);
    setSelectedAdmission(null);
  };

  const filtered = admissions.filter((adm) => {
    const matchesSearch =
      adm.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || adm.applicationStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#17133A]">Admissions</h1>
              <p className="text-[11px] text-[#686581]">Intake verification & room assignment</p>
            </div>
          </div>
          <Badge variant="purple" className="px-2.5 py-1">
            {admissions.length} Applications
          </Badge>
        </div>

        {/* Search & Filter */}
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applicant or admission #..."
            icon={<Search className="h-4 w-4 text-[#686581]" />}
            className="h-11 rounded-2xl bg-white border-[#E8E1F5] text-xs"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {["all", "under_review", "approved"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterStatus === st
                  ? "bg-[#6D28D9] text-white shadow-soft"
                  : "bg-white text-[#686581] border border-[#E8E1F5]"
              }`}
            >
              {st === "all" ? "All Admissions" : st === "under_review" ? "Under Review" : "Approved"}
            </button>
          ))}
        </div>

        {/* Admission Cards List */}
        <div className="space-y-3">
          {filtered.map((adm) => {
            const isApproved = adm.applicationStatus === "approved";
            return (
              <div
                key={adm.id}
                className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card hover:border-[#6D28D9]/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#6D28D9] font-black text-sm">
                      {adm.residentName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#17133A]">
                        {adm.residentName}
                      </h3>
                      <p className="text-[11px] text-[#686581]">
                        {adm.admissionNumber} • Intake: {adm.applicationSource.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={isApproved ? "success" : "warning"}
                    className="text-[10px] uppercase font-bold"
                  >
                    {adm.applicationStatus.replace("_", " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E8E1F5]/60">
                  <div className="p-2.5 rounded-xl bg-[#FAF8FF]">
                    <span className="text-[10px] text-[#686581] block">Applied Date</span>
                    <span className="font-bold text-[#17133A] text-[11px]">
                      {formatDate(adm.appliedAt)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8FF]">
                    <span className="text-[10px] text-[#686581] block">Room / Bed</span>
                    <span className="font-bold text-[#6D28D9] text-[11px]">
                      {adm.allocatedRoomNumber
                        ? `${adm.allocatedRoomNumber} (${adm.allocatedBedCode})`
                        : "Pending Room"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#686581]">
                    {adm.reviewedBy ? `Reviewed by ${adm.reviewedBy}` : "Awaiting documentation"}
                  </span>
                  {!isApproved ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAdmission(adm);
                        setIsApprovalModalOpen(true);
                      }}
                      className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white text-xs h-8 rounded-xl font-bold px-3 shadow-soft"
                    >
                      Approve & Bed
                    </Button>
                  ) : (
                    <span className="text-xs font-bold text-[#16A34A] flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Admitted</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Approval Modal */}
        {selectedAdmission && (
          <Modal
            isOpen={isApprovalModalOpen}
            onClose={() => setIsApprovalModalOpen(false)}
            title="Approve Admission & Allocate Bed"
          >
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]">
                <p className="text-xs font-black text-[#17133A]">
                  {selectedAdmission.residentName}
                </p>
                <p className="text-[11px] text-[#686581]">
                  Application {selectedAdmission.admissionNumber}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#17133A] flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-[#6D28D9]" />
                  <span>Assign Room</span>
                </label>
                <select
                  className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs font-semibold text-[#17133A]"
                  value={targetRoom}
                  onChange={(e) => setTargetRoom(e.target.value)}
                >
                  <option value="Room 101">Room 101 (Ground Floor - 2 Beds)</option>
                  <option value="Room 102">Room 102 (Ground Floor - Medical)</option>
                  <option value="Room 105">Room 105 (First Floor - 4 Beds)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#17133A] flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-[#6D28D9]" />
                  <span>Assign Bed</span>
                </label>
                <select
                  className="w-full h-11 rounded-2xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs font-semibold text-[#17133A]"
                  value={targetBed}
                  onChange={(e) => setTargetBed(e.target.value)}
                >
                  <option value="Bed 105-A">Bed 105-A (Window Side)</option>
                  <option value="Bed 105-B">Bed 105-B (Inner)</option>
                  <option value="Bed 102-A">Bed 102-A (Assisted Care)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleApprove}
                  className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold h-11 rounded-2xl"
                >
                  Confirm Admission & Bed
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
