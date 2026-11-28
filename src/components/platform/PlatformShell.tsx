"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  CreditCard,
  Layers,
  Receipt,
  FileText,
  BarChart3,
  ScrollText,
  Settings,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/platform/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platform/organizations", label: "Organizations", icon: Building2 },
  { href: "/platform/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/platform/plans", label: "Plans", icon: Layers },
  { href: "/platform/payments", label: "Payments", icon: Receipt },
  { href: "/platform/invoices", label: "Invoices", icon: FileText },
  { href: "/platform/usage", label: "Usage", icon: BarChart3 },
  { href: "/platform/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/platform/settings", label: "Settings", icon: Settings },
];

export function PlatformShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0D0B1E] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-purple-900/40 bg-[#14102E]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-900/40">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white">{title}</h1>
                <p className="text-xs text-purple-300/80">{subtitle}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-purple-950/70 border border-purple-700/40 text-[11px] font-bold text-purple-200">
              Platform Owner • MFA Enforced
            </span>
          </div>

          <nav className="flex gap-1.5 overflow-x-auto pb-1">
            {NAV_LINKS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-[#181339] text-purple-200/80 border border-purple-900/40 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
