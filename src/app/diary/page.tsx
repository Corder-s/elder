"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Sparkles,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { dataService } from "@/services/mockDataService";
import { DailyActivity } from "@/types";

export default function DailyDiaryPage() {
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLog, setNewLog] = useState({
    title: "",
    description: "",
    participantCount: 25,
  });

  useEffect(() => {
    dataService.getDailyActivities().then(setActivities);
  }, []);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: DailyActivity = {
      id: `act-${Date.now()}`,
      activityDate: new Date().toISOString().split("T")[0],
      title: newLog.title,
      description: newLog.description,
      participantCount: Number(newLog.participantCount),
      createdByName: "Ananya Deshmukh (Caretaker)",
      createdAt: new Date().toISOString(),
    };
    setActivities([entry, ...activities]);
    setIsAddModalOpen(false);
    setNewLog({ title: "", description: "", participantCount: 25 });
  };

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
              <h1 className="text-lg font-black text-[#17133A]">Daily Care Diary</h1>
              <p className="text-[11px] text-[#686581]">Activity logs, routines & observations</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white text-xs h-9 rounded-xl font-bold px-3 shadow-soft flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </Button>
        </div>

        {/* Entries List */}
        <div className="space-y-3">
          {activities.map((act) => (
            <div
              key={act.id}
              className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#6D28D9] font-black text-sm">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#17133A]">
                      {act.title}
                    </h3>
                    <p className="text-[11px] text-[#686581]">
                      Logged by {act.createdByName}
                    </p>
                  </div>
                </div>
                <Badge variant="purple" className="text-[10px] uppercase font-bold">
                  {act.participantCount ? `${act.participantCount} Elders` : "Routine"}
                </Badge>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]/80 space-y-1.5">
                <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider block">
                  Activity Notes:
                </span>
                <p className="text-xs text-[#17133A] leading-relaxed">
                  {act.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-[#686581]">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#6D28D9]" />
                  <span>Date: {act.activityDate}</span>
                </span>
                <span className="text-[#16A34A] font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verified</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Add Entry Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="New Shift Diary Log"
        >
          <form onSubmit={handleAddEntry} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#17133A]">Activity / Session Title</label>
              <Input
                required
                value={newLog.title}
                onChange={(e) => setNewLog({ ...newLog, title: e.target.value })}
                placeholder="e.g. Evening Bhajan & Tea Gathering"
                className="h-10 rounded-xl bg-[#FAF8FF] border-[#E8E1F5] text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#17133A]">Participants (Elders)</label>
              <Input
                type="number"
                value={newLog.participantCount}
                onChange={(e) => setNewLog({ ...newLog, participantCount: Number(e.target.value) })}
                className="h-10 rounded-xl bg-[#FAF8FF] border-[#E8E1F5] text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#17133A]">Care Notes & Activity</label>
              <textarea
                required
                rows={3}
                value={newLog.description}
                onChange={(e) => setNewLog({ ...newLog, description: e.target.value })}
                placeholder="Elderly mood, morning tea, vitals summary, recreation..."
                className="w-full rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] p-3 text-xs text-[#17133A] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold h-11 rounded-2xl"
              >
                Save Handover Entry
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
