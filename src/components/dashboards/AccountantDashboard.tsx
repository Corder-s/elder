"use client";

import React from "react";
import Link from "next/link";
import {
  IndianRupee,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Plus,
  CreditCard,
  Building,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function AccountantDashboard() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#17133A] dark:text-[#FAF8FF] flex items-center gap-1.5">
            <span>Ramesh Gupta</span>
            <span className="text-base">💼</span>
          </h2>
          <p className="text-xs text-[#686581] dark:text-[#9D99BA] mt-0.5">
            Finance & Accounts Head • Donations & Audit
          </p>
        </div>
        <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider bg-[#F3E8FF] px-2.5 py-1 rounded-full">
          Accountant
        </span>
      </div>

      {/* 4 Financial Metric Cards matching Reference Image 1 */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          Finance Overview
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#DCFCE7]/60 border border-[#BBF7D0]">
            <span className="text-[11px] font-semibold text-[#16A34A] block">
              This Month Income
            </span>
            <span className="text-xl font-black text-[#17133A] block mt-1">
              ₹ 3,85,000
            </span>
            <span className="text-[10px] font-bold text-[#16A34A] block mt-1">
              ↑ +24% vs last month
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFE4E6]/60 border border-[#FECDD3]">
            <span className="text-[11px] font-semibold text-[#E11D48] block">
              This Month Expense
            </span>
            <span className="text-xl font-black text-[#17133A] block mt-1">
              ₹ 2,40,000
            </span>
            <span className="text-[10px] font-semibold text-[#686581] block mt-1">
              Kitchen & Medical
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F3E8FF]/60 border border-[#E9D5FF]">
            <span className="text-[11px] font-semibold text-[#6D28D9] block">
              Donations (Month)
            </span>
            <span className="text-xl font-black text-[#17133A] block mt-1">
              ₹ 1,85,000
            </span>
            <span className="text-[10px] font-bold text-[#6D28D9] block mt-1">
              34 Receipts Issued
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FEF3C7]/60 border border-[#FDE68A]">
            <span className="text-[11px] font-semibold text-[#D97706] block">
              Pending Bills
            </span>
            <span className="text-xl font-black text-[#17133A] block mt-1">
              ₹ 65,000
            </span>
            <span className="text-[10px] font-semibold text-[#686581] block mt-1">
              Electricity & Supplies
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Income Bar Chart matching Reference Image 1 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-[#686581] uppercase tracking-wider">
            Monthly Donation & Income Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-44 pt-3 flex items-end justify-between gap-3 text-xs">
            {/* Aug */}
            <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-[#686581]">₹2.8L</span>
              <div className="w-full bg-[#E9D5FF] rounded-t-xl" style={{ height: "55%" }} />
              <span className="text-[10px] font-bold text-[#686581]">Aug</span>
            </div>

            {/* Sep */}
            <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-[#686581]">₹3.1L</span>
              <div className="w-full bg-[#D8B4FE] rounded-t-xl" style={{ height: "65%" }} />
              <span className="text-[10px] font-bold text-[#686581]">Sep</span>
            </div>

            {/* Oct */}
            <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-[#686581]">₹2.5L</span>
              <div className="w-full bg-[#C084FC] rounded-t-xl" style={{ height: "45%" }} />
              <span className="text-[10px] font-bold text-[#686581]">Oct</span>
            </div>

            {/* Nov */}
            <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-[#686581]">₹3.2L</span>
              <div className="w-full bg-[#A855F7] rounded-t-xl" style={{ height: "70%" }} />
              <span className="text-[10px] font-bold text-[#686581]">Nov</span>
            </div>

            {/* Jan (Peak) */}
            <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] font-bold text-[#6D28D9]">₹3.85L</span>
              <div
                className="w-full bg-gradient-to-t from-[#6D28D9] to-[#8B5CF6] rounded-t-xl shadow-soft"
                style={{ height: "90%" }}
              />
              <span className="text-[10px] font-bold text-[#6D28D9]">Jan</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Financial Actions matching Reference Image 1 */}
      <div>
        <h3 className="text-xs font-bold text-[#686581] uppercase tracking-wider mb-2.5">
          Quick Actions
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          <Link
            href="/finance"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex flex-col items-center justify-center gap-1.5 text-center shadow-card"
          >
            <div className="h-9 w-9 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A]">Add Donation</span>
          </Link>

          <Link
            href="/finance"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex flex-col items-center justify-center gap-1.5 text-center shadow-card"
          >
            <div className="h-9 w-9 rounded-xl bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A]">Add Expense</span>
          </Link>

          <Link
            href="/reports"
            className="p-3 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9] flex flex-col items-center justify-center gap-1.5 text-center shadow-card"
          >
            <div className="h-9 w-9 rounded-xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-[#17133A]">Generate Report</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
