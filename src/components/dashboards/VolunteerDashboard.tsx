"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, CheckSquare, Calendar, Clock, Users, Plus, Award } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function VolunteerDashboard() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#17133A] dark:text-[#FAF8FF] flex items-center gap-1.5">
            <span>Ananya Verma</span>
            <span className="text-base">✨</span>
          </h2>
          <p className="text-xs text-[#686581] dark:text-[#9D99BA] mt-0.5">
            Care Volunteer • Support & Service
          </p>
        </div>
        <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-2.5 py-1 rounded-full">
          Volunteer
        </span>
      </div>

      {/* 4 Metric Cards matching Reference Image 1 */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          My Activities
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#DCFCE7]/60 border border-[#BBF7D0] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Assigned Tasks</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">3</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#16A34A] text-white flex items-center justify-center">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFE4E6]/60 border border-[#FECDD3] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Events</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">1</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#E11D48] text-white flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#E0F2FE]/60 border border-[#BAE6FD] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">Hours (Month)</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">12 h</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#0284C7] text-white flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F3E8FF]/60 border border-[#E9D5FF] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#686581] block">People Assisted</span>
              <span className="text-2xl font-black text-[#17133A] mt-0.5 block">18</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#6D28D9] text-white flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Activities matching Reference Image 1 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-[#686581] uppercase tracking-wider">
              Upcoming Activities
            </CardTitle>
            <Link href="/events" className="text-xs font-bold text-[#6D28D9]">
              View All &gt;
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-1 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center font-bold">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-[#17133A] block">Basant Panchami Celebration</span>
                <span className="text-[11px] text-[#686581]">02 Feb, 10:00 AM • Courtyard</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-[#17133A] block">Recreation with Residents</span>
                <span className="text-[11px] text-[#686581]">03 Feb, 04:00 PM • Library Hall</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Volunteer Actions */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          Quick Actions
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          <Link
            href="/tasks"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex flex-col items-center justify-center gap-1.5 shadow-card"
          >
            <div className="h-9 w-9 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <CheckSquare className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A]">My Tasks</span>
          </Link>

          <Link
            href="/diary"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex flex-col items-center justify-center gap-1.5 shadow-card"
          >
            <div className="h-9 w-9 rounded-xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A]">Log Activity</span>
          </Link>

          <Link
            href="/events"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex flex-col items-center justify-center gap-1.5 shadow-card"
          >
            <div className="h-9 w-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A]">Events</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
