"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  IndianRupee,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  TrendingUp,
  Download,
  Filter,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { dataService } from "@/services/mockDataService";
import { Donation } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function FinancePage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    dataService.getDonations().then(setDonations);
  }, []);

  const filtered = donations.filter((d) =>
    d.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())
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
              <h1 className="text-lg font-black text-[#17133A]">Donations & Finance</h1>
              <p className="text-[11px] text-[#686581]">80G receipts, grants & expenditures</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white text-xs h-9 rounded-xl font-bold px-3 shadow-soft flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Entry</span>
          </Button>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] shadow-2xs">
            <div className="flex items-center gap-1 text-[#16A34A] text-[10px] font-bold">
              <ArrowDownLeft className="h-3 w-3" />
              <span>Income / Donations</span>
            </div>
            <p className="text-lg font-black text-[#17133A] mt-1">{formatCurrency(385000)}</p>
            <span className="text-[10px] font-semibold text-[#16A34A]">+24% this month</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] shadow-2xs">
            <div className="flex items-center gap-1 text-[#E11D48] text-[10px] font-bold">
              <ArrowUpRight className="h-3 w-3" />
              <span>Care Expenses</span>
            </div>
            <p className="text-lg font-black text-[#17133A] mt-1">{formatCurrency(240000)}</p>
            <span className="text-[10px] font-semibold text-[#686581]">Rations, medicines, power</span>
          </div>
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search donor or receipt #..."
          icon={<Search className="h-4 w-4 text-[#686581]" />}
          className="h-11 rounded-2xl bg-white border-[#E8E1F5] text-xs"
        />

        {/* Donation Cards */}
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-3xl bg-white border border-[#E8E1F5] shadow-card space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#16A34A] font-black text-sm">
                    ₹
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#17133A]">
                      {item.donorName}
                    </h3>
                    <p className="text-[11px] text-[#686581]">
                      Receipt: {item.receiptNumber} • Mode: {item.paymentMethod.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-[#16A34A] block">
                    {formatCurrency(item.amount)}
                  </span>
                  <Badge variant="purple" className="text-[9px] uppercase font-bold">
                    80G Verified
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E8E1F5]/60 text-xs">
                <span className="text-[11px] text-[#686581]">
                  Purpose: <strong className="text-[#17133A]">{item.purpose || "General Welfare"}</strong>
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#6D28D9] hover:underline"
                >
                  <Download className="h-3 w-3" />
                  <span>Download 80G Receipt</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Entry Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Record New Contribution"
        >
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#17133A]">Donor Full Name</label>
              <Input
                placeholder="e.g. Smt. Radha Sharma"
                className="h-10 rounded-xl bg-[#FAF8FF] border-[#E8E1F5] text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#17133A]">Amount (₹)</label>
              <Input
                type="number"
                placeholder="e.g. 25000"
                className="h-10 rounded-xl bg-[#FAF8FF] border-[#E8E1F5] text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#17133A]">Payment Method</label>
              <select className="w-full h-10 rounded-xl border border-[#E8E1F5] bg-[#FAF8FF] px-3 text-xs font-semibold text-[#17133A]">
                <option>UPI / QR Scan</option>
                <option>Bank NEFT/RTGS</option>
                <option>Cheque</option>
                <option>Cash (Official Receipt)</option>
              </select>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(false)}
              className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold h-11 rounded-2xl mt-2"
            >
              Generate 80G Tax Receipt
            </Button>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
