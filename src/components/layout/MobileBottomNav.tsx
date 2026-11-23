"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Plus,
  CheckSquare,
  Grid,
  Heart,
  Stethoscope,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { RoleType } from "@/types";

interface MobileBottomNavProps {
  onOpenQuickAction: () => void;
  onOpenDrawer: () => void;
}

export function MobileBottomNav({
  onOpenQuickAction,
  onOpenDrawer,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { currentRole } = useAuth();

  // Role-specific 2nd and 4th nav items
  const getSecondItem = (role: RoleType) => {
    switch (role) {
      case "family_guardian":
        return { label: "Loved One", href: "/residents", icon: Heart };
      case "doctor":
        return { label: "Patients", href: "/medical-records", icon: Stethoscope };
      case "accountant":
        return { label: "Donations", href: "/finance", icon: Users };
      default:
        return { label: "Residents", href: "/residents", icon: Users };
    }
  };

  const getFourthItem = (role: RoleType) => {
    switch (role) {
      case "super_admin":
      case "accountant":
        return { label: "Reports", href: "/reports", icon: BarChart3 };
      default:
        return { label: "Tasks", href: "/tasks", icon: CheckSquare };
    }
  };

  const secondItem = getSecondItem(currentRole);
  const fourthItem = getFourthItem(currentRole);

  const SecondIcon = secondItem.icon;
  const FourthIcon = fourthItem.icon;

  const isHomeActive = pathname === "/";
  const isSecondActive = pathname.startsWith(secondItem.href);
  const isFourthActive = pathname.startsWith(fourthItem.href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-[#E8E1F5] shadow-lg dark:bg-[#1B1638] dark:border-[#2C2554] max-w-md mx-auto select-none">
      <div className="flex h-full items-center justify-around px-2 relative">
        {/* 1. Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 w-14 transition-colors ${
            isHomeActive
              ? "text-[#6D28D9] font-bold dark:text-[#8B5CF6]"
              : "text-[#686581] hover:text-[#6D28D9]"
          }`}
        >
          <Home className={`h-5 w-5 ${isHomeActive ? "stroke-[2.5]" : ""}`} />
          <span className="text-[10px]">Home</span>
        </Link>

        {/* 2. Main Role Module (e.g. Residents / Patients / Loved One) */}
        <Link
          href={secondItem.href}
          className={`flex flex-col items-center justify-center gap-1 w-14 transition-colors ${
            isSecondActive
              ? "text-[#6D28D9] font-bold dark:text-[#8B5CF6]"
              : "text-[#686581] hover:text-[#6D28D9]"
          }`}
        >
          <SecondIcon className={`h-5 w-5 ${isSecondActive ? "stroke-[2.5]" : ""}`} />
          <span className="text-[10px]">{secondItem.label}</span>
        </Link>

        {/* 3. Center Elevated Floating Purple Action Button */}
        <div className="relative -top-4">
          <button
            onClick={onOpenQuickAction}
            className="flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] text-white shadow-floating border-4 border-[#FAF8FF] dark:border-[#120F26] active:scale-95 transition-transform"
            aria-label="Quick Actions"
          >
            <Plus className="h-6 w-6 stroke-[3]" />
          </button>
        </div>

        {/* 4. Tasks or Reports */}
        <Link
          href={fourthItem.href}
          className={`flex flex-col items-center justify-center gap-1 w-14 transition-colors ${
            isFourthActive
              ? "text-[#6D28D9] font-bold dark:text-[#8B5CF6]"
              : "text-[#686581] hover:text-[#6D28D9]"
          }`}
        >
          <FourthIcon className={`h-5 w-5 ${isFourthActive ? "stroke-[2.5]" : ""}`} />
          <span className="text-[10px]">{fourthItem.label}</span>
        </Link>

        {/* 5. More (Opens side drawer menu) */}
        <button
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center gap-1 w-14 text-[#686581] hover:text-[#6D28D9] transition-colors"
        >
          <Grid className="h-5 w-5" />
          <span className="text-[10px]">More</span>
        </button>
      </div>
    </nav>
  );
}
