"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Users,
  ClipboardCheck,
  Stethoscope,
  Ambulance,
  UserPlus,
  IndianRupee,
  Receipt,
  FileCheck,
  Building2,
  ChevronRight,
  FileDown,
  Printer,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface ReportItem {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
}

const REPORTS_LIST: ReportItem[] = [
  { id: "1", title: "Resident Report", icon: Users, description: "Active residents, bed occupancy, and profile data." },
  { id: "2", title: "Attendance Report", icon: ClipboardCheck, description: "Daily headcount, medical leave, and outside movement logs." },
  { id: "3", title: "Medical Report", icon: Stethoscope, description: "Doctor visits, vital observation trends, and prescription audits." },
  { id: "4", title: "Rescue Report", icon: Ambulance, description: "Intake cases, GPS locations, police logs, and reunifications." },
  { id: "5", title: "Visitor Report", icon: UserPlus, description: "Gate check-in timestamps, family visits, and donor meetings." },
  { id: "6", title: "Donation Report", icon: IndianRupee, description: "Issued 80G tax receipts, UPI transactions, and donor history." },
  { id: "7", title: "Expense Report", icon: Receipt, description: "Ashram operational expenditure, groceries, and medical supplies." },
  { id: "8", title: "Government Compliance", icon: FileCheck, description: "NOCs, fire safety, elderly welfare audits, and certificates." },
  { id: "9", title: "Annual NGO Report", icon: Building2, description: "Consolidated annual operational and financial transparency review." },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  const handleDownload = (format: string) => {
    alert(`Generating ${format.toUpperCase()} report for: ${selectedReport?.title}`);
    setSelectedReport(null);
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#17133A]">Reports</h2>
          <span className="text-xs font-bold text-[#6D28D9] bg-[#F3E8FF] px-2.5 py-1 rounded-full">
            9 Formats
          </span>
        </div>

        {/* Reports List matching Reference Image 1 Screen 7 */}
        <div className="space-y-2.5">
          {REPORTS_LIST.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedReport(item)}
                className="p-3.5 rounded-2xl bg-white border border-[#E8E1F5] hover:border-[#6D28D9]/40 shadow-card flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-2xl bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#17133A]">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#686581] mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-[#686581]/70 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Report Export Dialog */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={`Generate ${selectedReport.title}`}
          description={selectedReport.description}
          className="max-w-xs text-center"
        >
          <div className="space-y-3 pt-2 text-xs">
            <Button
              onClick={() => handleDownload("pdf")}
              className="w-full rounded-2xl flex items-center justify-center gap-2 font-bold"
            >
              <FileDown className="h-4 w-4" />
              <span>Download Formatted PDF</span>
            </Button>

            <Button
              onClick={() => handleDownload("excel")}
              variant="outline"
              className="w-full rounded-2xl flex items-center justify-center gap-2 font-bold"
            >
              <FileDown className="h-4 w-4" />
              <span>Export Excel Spreadsheet</span>
            </Button>

            <Button
              onClick={() => handleDownload("print")}
              variant="secondary"
              className="w-full rounded-2xl flex items-center justify-center gap-2 font-bold"
            >
              <Printer className="h-4 w-4" />
              <span>Print Official Copy</span>
            </Button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
