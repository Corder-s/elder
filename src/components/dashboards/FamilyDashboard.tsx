"use client";

import React from "react";
import Link from "next/link";
import {
  Heart,
  Stethoscope,
  Pill,
  Clock,
  Calendar,
  CheckCircle2,
  FileText,
  Phone,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FamilyDashboard() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#17133A] dark:text-[#FAF8FF] flex items-center gap-1.5">
            <span>Suresh Verma</span>
            <span className="text-base">❤️</span>
          </h2>
          <p className="text-xs text-[#686581] dark:text-[#9D99BA] mt-0.5">
            Family Portal • Linked to Ram Prasad
          </p>
        </div>
        <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-2.5 py-1 rounded-full">
          Family Access
        </span>
      </div>

      {/* "My Loved One" Card matching Reference Image 1 */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          My Loved One
        </h3>
        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-[#6D28D9] shadow-soft shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80"
                    alt="Mr. Ram Prasad"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-base font-black text-[#17133A] dark:text-white leading-tight">
                    Mr. Ram Prasad
                  </h4>
                  <p className="text-xs text-[#686581] mt-0.5">
                    Age: 72 Years • Resident ID: <span className="font-semibold text-[#6D28D9]">RES-014</span>
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded-full">
                Admitted
              </span>
            </div>

            {/* 4 Action Pills matching Reference Image 1 */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#E8E1F5]">
              <Link
                href="/medical-records"
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#FAF8FF] hover:bg-[#F3E8FF] text-center transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center mb-1">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-[#17133A] leading-tight">
                  Health Records
                </span>
              </Link>

              <Link
                href="/medicines"
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#FAF8FF] hover:bg-[#F3E8FF] text-center transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center mb-1">
                  <Pill className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-[#17133A] leading-tight">
                  Medicine Schedule
                </span>
              </Link>

              <Link
                href="/visitors"
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#FAF8FF] hover:bg-[#F3E8FF] text-center transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mb-1">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-[#17133A] leading-tight">
                  Visit History
                </span>
              </Link>

              <Link
                href="/diary"
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#FAF8FF] hover:bg-[#F3E8FF] text-center transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center mb-1">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-[#17133A] leading-tight">
                  Daily Updates
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Update Card matching Reference Image 1 */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          Latest Update
        </h3>
        <Card className="bg-[#FAF8FF] border-[#E8E1F5]">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#17133A] leading-tight">
                General checkup completed.
              </h4>
              <p className="text-xs text-[#686581] mt-0.5">
                All vitals are stable. BP: 130/85, Sugar normal. Enjoyed morning herbal tea.
              </p>
              <span className="text-[10px] font-semibold text-[#6D28D9] block mt-1.5">
                Today, 10:24 AM • Verified by Dr. Sengupta
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Book Visit Slot Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-[#686581] uppercase tracking-wider">
            Visiting Hours & Booking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-1 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5]">
            <div>
              <span className="font-bold text-[#17133A] block">Next Permitted Visit: Sunday</span>
              <span className="text-[11px] text-[#686581]">10:00 AM - 12:00 PM • Room 101</span>
            </div>
            <Link href="/visitors">
              <Button size="sm" variant="secondary" className="h-8 text-xs font-bold">
                Book Slot
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
