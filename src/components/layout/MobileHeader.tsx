"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, Bell, ChevronDown, Building2, Shield } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/context/AuthContext";

interface MobileHeaderProps {
  onOpenDrawer: () => void;
}

export function MobileHeader({ onOpenDrawer }: MobileHeaderProps) {
  const { user, currentRole } = useAuth();
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("Sri Seva Old Age Home");

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E8E1F5] bg-white/95 px-4 backdrop-blur-md dark:border-[#2C2554] dark:bg-[#1B1638]/95 select-none transition-colors">
      {/* Left: Hamburger menu icon */}
      <button
        onClick={onOpenDrawer}
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] text-[#17133A] hover:bg-[#F3E8FF] hover:text-[#6D28D9] transition-colors dark:bg-[#241D45] dark:border-[#2C2554] dark:text-white"
        aria-label="Open mobile menu drawer"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Center: ElderCare OS Logo + Organization Selector */}
      <div className="flex flex-col items-center">
        <Link href="/" className="flex items-center gap-1.5">
          <Logo size="sm" showText={false} />
          <span className="text-sm font-black text-[#17133A] dark:text-[#FAF8FF]">
            ElderCare<span className="text-[#6D28D9] dark:text-[#8B5CF6]">OS</span>
          </span>
        </Link>

        {/* Organization Name with Dropdown Arrow */}
        <div className="relative">
          <button
            onClick={() => setIsBranchOpen(!isBranchOpen)}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#686581] hover:text-[#6D28D9] dark:text-[#9D99BA]"
          >
            <span className="truncate max-w-[140px]">{selectedBranch}</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {isBranchOpen && (
            <div className="absolute left-1/2 transform -translate-x-1/2 mt-1 w-48 rounded-2xl border border-[#E8E1F5] bg-white p-2 shadow-xl dark:border-[#2C2554] dark:bg-[#1B1638] z-50 animate-in fade-in zoom-in-95 text-left">
              <span className="text-[10px] uppercase font-bold text-[#686581] px-2 py-1 block">
                Select Branch
              </span>
              <button
                onClick={() => {
                  setSelectedBranch("Sri Seva Old Age Home");
                  setIsBranchOpen(false);
                }}
                className="w-full text-left text-xs px-2.5 py-1.5 rounded-xl font-semibold hover:bg-[#F3E8FF] text-[#17133A] dark:text-white"
              >
                Sri Seva Old Age Home (Delhi)
              </button>
              <button
                onClick={() => {
                  setSelectedBranch("Vrindavan Care Ashram");
                  setIsBranchOpen(false);
                }}
                className="w-full text-left text-xs px-2.5 py-1.5 rounded-xl font-semibold hover:bg-[#F3E8FF] text-[#17133A] dark:text-white"
              >
                Vrindavan Care Ashram
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Notifications Bell & Profile Avatar */}
      <div className="flex items-center gap-2">
        <Link
          href="/tasks"
          className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FAF8FF] border border-[#E8E1F5] text-[#17133A] hover:bg-[#F3E8FF] dark:bg-[#241D45] dark:border-[#2C2554] dark:text-white"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#E11D48] ring-2 ring-white" />
        </Link>

        <button
          onClick={onOpenDrawer}
          className="h-9 w-9 rounded-full overflow-hidden bg-purple-200 border-2 border-white shadow-2xs shrink-0"
        >
          <img
            src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
            alt="Profile Avatar"
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </header>
  );
}
