"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  ChevronRight,
  Plus,
  Activity,
  HeartPulse,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

interface HistoryItem {
  condition: string;
  since: string;
  notes: string;
}

const MEDICAL_HISTORY: HistoryItem[] = [
  { condition: "Hypertension", since: "Since 2018", notes: "Managed with Amlodipine 5mg daily" },
  { condition: "Type 2 Diabetes", since: "Since 2020", notes: "Monitored via fasting blood sugar" },
  { condition: "Osteoarthritis", since: "Since 2021", notes: "Knee joint mobility assistance required" },
];

export default function MedicalRecordsPage() {
  const [tab, setTab] = useState<"history" | "prescriptions" | "vitals">("history");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#17133A]">Medical Records</h2>
          <span className="text-xs font-bold text-[#E11D48] bg-[#FFE4E6] px-2.5 py-1 rounded-full uppercase text-[10px]">
            Restricted
          </span>
        </div>

        {/* Resident Header Card matching Reference Image 1 Screen 4 */}
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
              RES-014 • Age: 72 • Room A-101
            </p>
          </div>
        </div>

        {/* Navigation Tabs matching Reference Image 1 Screen 4 */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white border border-[#E8E1F5]">
          {(["history", "prescriptions", "vitals"] as const).map((t) => (
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

        {/* Tab 1: Medical History matching Reference Image 1 Screen 4 */}
        {tab === "history" && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#686581] uppercase tracking-wider">
              Medical History
            </h4>

            {MEDICAL_HISTORY.map((item) => (
              <div
                key={item.condition}
                className="p-4 rounded-2xl bg-white border border-[#E8E1F5] shadow-card hover:border-[#6D28D9]/40 flex items-center justify-between cursor-pointer transition-all"
              >
                <div>
                  <h5 className="text-sm font-bold text-[#17133A]">
                    {item.condition}
                  </h5>
                  <span className="text-xs text-[#686581] mt-0.5 block">
                    {item.since}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-[#686581]" />
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Prescriptions */}
        {tab === "prescriptions" && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#686581] uppercase tracking-wider">
              Doctor-Verified Prescriptions
            </h4>
            <div className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] shadow-card text-xs space-y-1">
              <span className="font-bold text-[#17133A] block">Amlodipine Besylate 5mg</span>
              <span className="text-[#686581]">1 tablet daily after breakfast • Dr. A. K. Sengupta</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] shadow-card text-xs space-y-1">
              <span className="font-bold text-[#17133A] block">Metformin HCl 500mg</span>
              <span className="text-[#686581]">1 tablet twice daily • Dr. A. K. Sengupta</span>
            </div>
          </div>
        )}

        {/* Tab 3: Vitals */}
        {tab === "vitals" && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#686581] uppercase tracking-wider">
              Recent Clinical Observations
            </h4>
            <div className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] shadow-card text-xs flex justify-between">
              <div>
                <span className="font-bold text-[#17133A] block">Blood Pressure: 130/85 mmHg</span>
                <span className="text-[11px] text-[#686581]">Today, 08:30 AM • Lead Nurse Sunita Rao</span>
              </div>
              <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full h-max">
                Normal
              </span>
            </div>
          </div>
        )}

        {/* Bottom Button matching Reference Image 1 Screen 4 */}
        <div className="pt-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            size="lg"
            className="w-full rounded-2xl font-bold shadow-soft flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Record</span>
          </Button>
        </div>
      </div>

      {/* New Medical Record Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Clinical Health Record"
        description="Authorized physician entry for Ram Prasad (RES-014)."
      >
        <div className="space-y-3 text-xs">
          <input
            placeholder="Condition / Diagnosis Title"
            className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
          />
          <input
            placeholder="Effective Date / Since Year"
            className="w-full h-10 rounded-xl border border-[#E8E1F5] px-3 font-medium"
          />
          <textarea
            rows={3}
            placeholder="Clinical observations and treatment notes..."
            className="w-full rounded-xl border border-[#E8E1F5] p-3 font-medium"
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
