"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Clock,
  ArrowLeft,
  CheckCircle2,
  LogIn,
  LogOut,
  Phone,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { dataService } from "@/services/mockDataService";
import { Visit } from "@/types";

export default function VisitorsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newVisitor, setNewVisitor] = useState({
    visitorName: "",
    residentName: "",
    relationship: "Son",
    phone: "",
    purpose: "Routine Family Visit",
  });

  useEffect(() => {
    dataService.getVisits().then(setVisits);
  }, []);

  const handleCheckOut = (id: string) => {
    setVisits((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              exitAt: new Date().toISOString(),
            }
          : v
      )
    );
  };

  const handleAddVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: Visit = {
      id: `vis-${Date.now()}`,
      visitorId: `v-${Date.now()}`,
      residentId: "res-01",
      residentName: newVisitor.residentName,
      visitorName: newVisitor.visitorName,
      relationship: newVisitor.relationship,
      entryAt: new Date().toISOString(),
      purpose: newVisitor.purpose,
      visitorPhone: newVisitor.phone,
      recordedBy: "Security Desk",
    };
    setVisits([entry, ...visits]);
    setIsAddModalOpen(false);
    setNewVisitor({
      visitorName: "",
      residentName: "",
      relationship: "Son",
      phone: "",
      purpose: "Routine Family Visit",
    });
  };

  const activeVisitors = visits.filter((v) => !v.exitAt);

  const filtered = visits.filter((v) =>
    v.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.residentName ? v.residentName.toLowerCase().includes(searchQuery.toLowerCase()) : false)
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
              <h1 className="text-lg font-black text-[#17133A]">Visitor Pass</h1>
              <p className="text-[11px] text-[#686581]">Entry, relationship & badge records</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white text-xs h-9 rounded-xl font-bold px-3 shadow-soft flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Pass</span>
          </Button>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] shadow-2xs">
            <span className="text-[10px] font-bold text-[#686581] uppercase block">Inside Premises</span>
            <span className="text-xl font-black text-[#16A34A]">{activeVisitors.length} Visitors</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] shadow-2xs">
            <span className="text-[10px] font-bold text-[#686581] uppercase block">Total Today</span>
            <span className="text-xl font-black text-[#6D28D9]">{visits.length} Logged</span>
          </div>
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search visitor or resident..."
          icon={<Search className="h-4 w-4 text-[#686581]" />}
          className="h-11 rounded-2xl bg-white border-[#E8E1F5] text-xs"
        />

        {/* Visitor Cards */}
        <div className="space-y-3">
          {filtered.map((item) => {
            const isActive = !item.exitAt;
            return (
              <div
                key={item.id}
                className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#6D28D9] font-black text-sm">
                      {item.visitorName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#17133A]">
                        {item.visitorName}
                      </h3>
                      <p className="text-[11px] text-[#686581]">
                        Visiting: <strong className="text-[#17133A]">{item.residentName || "Ashram Resident"}</strong> ({item.relationship || "Visitor"})
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={isActive ? "success" : "outline"}
                    className="text-[10px] uppercase font-bold"
                  >
                    {isActive ? "On Premises" : "Checked Out"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E8E1F5]/60">
                  <div className="p-2.5 rounded-xl bg-[#FAF8FF]">
                    <span className="text-[10px] text-[#686581] block">Check-in Time</span>
                    <span className="font-bold text-[#17133A] text-[11px] flex items-center gap-1">
                      <LogIn className="h-3 w-3 text-[#16A34A]" />
                      <span>{item.entryAt ? "10:15 AM" : "--"}</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8FF]">
                    <span className="text-[10px] text-[#686581] block">Purpose</span>
                    <span className="font-bold text-[#6D28D9] text-[11px]">
                      {item.purpose || "Family Visit"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#686581] flex items-center gap-1">
                    <Phone className="h-3 w-3 text-[#686581]" />
                    <span>{item.visitorPhone || "+91 98765 43210"}</span>
                  </span>

                  {isActive ? (
                    <Button
                      size="sm"
                      onClick={() => handleCheckOut(item.id)}
                      className="bg-[#FFE4E6] hover:bg-[#FFE4E6]/80 text-[#E11D48] text-xs h-8 rounded-xl font-bold px-3 border border-[#E11D48]/20"
                    >
                      Check Out
                    </Button>
                  ) : (
                    <span className="text-xs text-[#686581] flex items-center gap-1">
                      <LogOut className="h-3 w-3" />
                      <span>Departed {item.exitAt ? "01:00 PM" : ""}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Visitor Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Issue Visitor Gate Pass"
        >
          <form onSubmit={handleAddVisitor} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#17133A]">Visitor Full Name</label>
              <Input
                required
                value={newVisitor.visitorName}
                onChange={(e) => setNewVisitor({ ...newVisitor, visitorName: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className="h-10 rounded-xl bg-[#FAF8FF] border-[#E8E1F5] text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#17133A]">Visiting Resident</label>
              <Input
                required
                value={newVisitor.residentName}
                onChange={(e) => setNewVisitor({ ...newVisitor, residentName: e.target.value })}
                placeholder="e.g. Ram Prasad"
                className="h-10 rounded-xl bg-[#FAF8FF] border-[#E8E1F5] text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#17133A]">Relationship</label>
                <select
                  value={newVisitor.relationship}
                  onChange={(e) => setNewVisitor({ ...newVisitor, relationship: e.target.value })}
                  className="w-full h-10 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs font-semibold text-[#17133A]"
                >
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Relative">Relative</option>
                  <option value="Friend">Friend</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#17133A]">Contact Phone</label>
                <Input
                  required
                  value={newVisitor.phone}
                  onChange={(e) => setNewVisitor({ ...newVisitor, phone: e.target.value })}
                  placeholder="+91..."
                  className="h-10 rounded-xl bg-[#FAF8FF] border-[#E8E1F5] text-xs"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold h-11 rounded-2xl"
              >
                Log Visitor Entry
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
