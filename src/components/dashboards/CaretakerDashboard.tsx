"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HeartPulse,
  ClipboardCheck,
  Pill,
  Utensils,
  CheckCircle2,
  Clock,
  Sparkles,
  BedDouble,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CareTask {
  id: string;
  title: string;
  progress: string;
  completed: boolean;
}

export function CaretakerDashboard() {
  const [tasks, setTasks] = useState<CareTask[]>([
    { id: "1", title: "Morning medicine", progress: "(82/86)", completed: true },
    { id: "2", title: "Breakfast served", progress: "(86/86)", completed: true },
    { id: "3", title: "Vitals check", progress: "(0/86)", completed: false },
    { id: "4", title: "Room cleanliness", progress: "(0/12)", completed: false },
  ]);

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#17133A] dark:text-[#FAF8FF] flex items-center gap-1.5">
            <span>Sunita Rao</span>
            <span className="text-base">👩‍⚕️</span>
          </h2>
          <p className="text-xs text-[#686581] dark:text-[#9D99BA] mt-0.5">
            Lead Caretaker / Nurse • Care & Support
          </p>
        </div>
        <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-2.5 py-1 rounded-full">
          Caretaker
        </span>
      </div>

      {/* 4 Daily Care Metric Cards matching Reference Image 1 */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          Daily Care Overview
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#DCFCE7]/60 border border-[#BBF7D0] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Attendance</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">82/86</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#16A34A] text-white flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFE4E6]/60 border border-[#FECDD3] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Medicines</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">24 Due</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#E11D48] text-white flex items-center justify-center">
              <Pill className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FEF3C7]/60 border border-[#FDE68A] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Care Tasks</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">6</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#D97706] text-white flex items-center justify-center">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F3E8FF]/60 border border-[#E9D5FF] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Meals</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">3 Served</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#6D28D9] text-white flex items-center justify-center">
              <Utensils className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Care Tasks Checklist matching Reference Image 1 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-[#686581] uppercase tracking-wider">
            Today's Care Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                task.completed
                  ? "bg-[#FAF8FF] border-[#E8E1F5]"
                  : "bg-white border-[#E8E1F5] hover:border-[#6D28D9]/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-5 w-5 rounded-md flex items-center justify-center border transition-colors ${
                    task.completed
                      ? "bg-[#16A34A] border-[#16A34A] text-white"
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {task.completed && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <span
                  className={`text-xs font-bold ${
                    task.completed
                      ? "text-[#17133A] dark:text-[#FAF8FF]"
                      : "text-[#686581]"
                  }`}
                >
                  {task.title}
                </span>
              </div>
              <span className="text-xs font-bold text-[#686581]">
                {task.progress}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Care Actions */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          Care Actions
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/medicines"
            className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex items-center gap-3 shadow-card"
          >
            <div className="h-10 w-10 rounded-2xl bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center shrink-0">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#17133A] block">Give Medicines</span>
              <span className="text-[10px] text-[#686581]">24 doses due today</span>
            </div>
          </Link>

          <Link
            href="/attendance"
            className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex items-center gap-3 shadow-card"
          >
            <div className="h-10 w-10 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#17133A] block">Mark Attendance</span>
              <span className="text-[10px] text-[#686581]">Daily room roll call</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
