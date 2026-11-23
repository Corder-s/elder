"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Heart,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

interface EventItem {
  id: string;
  title: string;
  time: string;
  category: string;
  color: string;
}

const DEV_EVENTS: EventItem[] = [
  {
    id: "ev-1",
    title: "Basant Panchami Celebration",
    time: "02 Feb, 10:00 AM",
    category: "Cultural & Puja",
    color: "bg-[#F3E8FF] text-[#6D28D9]",
  },
  {
    id: "ev-2",
    title: "Health Checkup Camp",
    time: "05 Feb, 09:00 AM",
    category: "Medical Clinic",
    color: "bg-[#E0F2FE] text-[#0284C7]",
  },
  {
    id: "ev-3",
    title: "Weekly Bhajan Sandhya",
    time: "07 Feb, 05:30 PM",
    category: "Spiritual",
    color: "bg-[#FEF3C7] text-[#D97706]",
  },
];

export default function EventsPage() {
  const [selectedDay, setSelectedDay] = useState(2);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Calendar dates for Feb 2025 (matching Reference Image 1 Screen 6)
  const daysInMonth = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <AppShell>
      <div className="space-y-4 relative pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#17133A]">Events & Calendar</h2>
          <span className="text-xs font-bold text-[#6D28D9] bg-[#F3E8FF] px-2.5 py-1 rounded-full">
            Feb 2025
          </span>
        </div>

        {/* Calendar Widget matching Reference Image 1 Screen 6 */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            {/* Month Header with chevrons */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E1F5] mb-3">
              <ChevronLeft className="h-4 w-4 text-[#686581] cursor-pointer" />
              <span className="text-xs font-bold text-[#17133A]">Feb 2025</span>
              <ChevronRight className="h-4 w-4 text-[#686581] cursor-pointer" />
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#686581] mb-2">
              <span className="text-[#E11D48]">Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Days Matrix (Feb 2025 starts on Saturday, so 6 blank offsets) */}
            <div className="grid grid-cols-7 text-center gap-y-2 text-xs font-semibold">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              {/* Day 1 */}
              <span className="py-1 text-[#686581]">1</span>

              {/* Days 2 to 28 */}
              {daysInMonth.slice(1).map((day) => {
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`h-7 w-7 mx-auto rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-[#6D28D9] text-white font-bold shadow-soft"
                        : "text-[#17133A] hover:bg-[#F3E8FF]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events List matching Reference Image 1 Screen 6 */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-[#686581] uppercase tracking-wider">
            Upcoming Events
          </h4>

          <div className="space-y-2.5">
            {DEV_EVENTS.map((event) => (
              <div
                key={event.id}
                className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] shadow-card flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${event.color}`}>
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#17133A]">
                      {event.title}
                    </h5>
                    <span className="text-[11px] text-[#686581] mt-0.5 block">
                      {event.time}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-[#6D28D9] bg-[#F3E8FF] px-2 py-0.5 rounded-full">
                  {event.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Purple Plus Button matching Reference Image 1 Screen 6 */}
        <div className="fixed bottom-20 right-6 z-30">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] text-white shadow-floating flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule Event or Medical Camp"
        description="Add a community celebration or doctor clinic to the calendar."
      >
        <div className="space-y-3 text-xs">
          <input
            placeholder="Event Title (e.g. Free Eye Checkup Camp)"
            className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
          />
          <input
            placeholder="Date & Time (e.g. 10 Feb, 10:00 AM)"
            className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
          />
          <input
            placeholder="Location / Courtyard / Hall"
            className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => setIsAddModalOpen(false)}>
              Schedule Event
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
