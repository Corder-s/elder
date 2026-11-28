"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, CreditCard, Layers, FileText, History, BarChart3 } from "lucide-react";

const TABS = [
  { href: "/settings/billing", label: "Overview", icon: CreditCard },
  { href: "/settings/billing/plans", label: "Plans", icon: Layers },
  { href: "/settings/billing/invoices", label: "Invoices", icon: FileText },
  { href: "/settings/billing/payment-history", label: "Payments", icon: History },
  { href: "/settings/billing/usage", label: "Usage", icon: BarChart3 },
];

export function BillingSubNav({ title, subtitle }: { title: string; subtitle: string }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#E8E1F5] text-[#17133A] shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-[#17133A]">{title}</h1>
            <p className="text-[11px] text-[#686581]">{subtitle}</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#F3E8FF] text-[#6D28D9] text-[10px] font-bold uppercase tracking-wider">
          Razorpay Test Mode
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors ${
                active
                  ? "bg-[#6D28D9] text-white shadow-soft"
                  : "bg-white border border-[#E8E1F5] text-[#686581] hover:text-[#17133A]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
