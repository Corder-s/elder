"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Pill, Check, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface MedicineItem {
  id: string;
  name: string;
  dose: string;
  timeSlot: string;
  taken: boolean;
}

export default function MedicinesPage() {
  const [tab, setTab] = useState<"today" | "upcoming" | "history">("today");
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    {
      id: "med-1",
      name: "Amlodipine 5 mg",
      dose: "1 tablet",
      timeSlot: "Morning",
      taken: true,
    },
    {
      id: "med-2",
      name: "Metformin 500 mg",
      dose: "1 tablet",
      timeSlot: "Afternoon",
      taken: false,
    },
    {
      id: "med-3",
      name: "Atorvastatin 10 mg",
      dose: "1 tablet",
      timeSlot: "Night",
      taken: false,
    },
  ]);

  const toggleDose = (id: string) => {
    setMedicines(
      medicines.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m))
    );
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#17133A]">Medicine Schedule</h2>
          <span className="text-xs font-bold text-[#6D28D9] bg-[#F3E8FF] px-2.5 py-1 rounded-full">
            {medicines.filter((m) => m.taken).length} / {medicines.length} Given
          </span>
        </div>

        {/* Resident Header Card matching Reference Image 1 Screen 5 */}
        <div className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card flex items-center gap-3.5">
          <div className="h-13 w-13 rounded-full overflow-hidden border-2 border-[#6D28D9] shadow-soft shrink-0">
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
              alt="Mr. Ram Prasad"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-base font-black text-[#17133A]">
              Mr. Ram Prasad
            </h3>
            <p className="text-xs text-[#686581] mt-0.5">
              RES-014 • Room A-101 (Bed-1)
            </p>
          </div>
        </div>

        {/* Navigation Tabs matching Reference Image 1 Screen 5 */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white border border-[#E8E1F5]">
          {(["today", "upcoming", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                tab === t
                  ? "bg-[#6D28D9] text-white shadow-soft"
                  : "text-[#686581] hover:text-[#17133A]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Today's Medicines (3) matching Reference Image 1 Screen 5 */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-[#686581] uppercase tracking-wider">
            Today's Medicines ({medicines.length})
          </h4>

          <div className="space-y-2.5">
            {medicines.map((med) => (
              <div
                key={med.id}
                onClick={() => toggleDose(med.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  med.taken
                    ? "bg-[#FAF8FF] border-[#E8E1F5]"
                    : "bg-white border-[#E8E1F5] shadow-card hover:border-[#6D28D9]/40"
                }`}
              >
                <div>
                  <h5 className="text-sm font-bold text-[#17133A]">
                    {med.name}
                  </h5>
                  <span className="text-xs text-[#686581] mt-0.5 block">
                    {med.dose} • {med.timeSlot}
                  </span>
                </div>

                {/* Checkbox button matching Reference Image 1 */}
                <button
                  type="button"
                  className={`h-7 w-7 rounded-lg flex items-center justify-center border transition-all ${
                    med.taken
                      ? "bg-[#16A34A] border-[#16A34A] text-white shadow-2xs"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {med.taken && <Check className="h-4 w-4 stroke-[3]" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
