"use client";

import React, { useState } from "react";
import { MobileHeader } from "./MobileHeader";
import { MobileDrawer } from "./MobileDrawer";
import { MobileBottomNav } from "./MobileBottomNav";
import { QuickActionSheet } from "./QuickActionSheet";
import { Smartphone, Monitor } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isMobileFrameView, setIsMobileFrameView] = useState(true);

  return (
    <div className="min-h-screen bg-[#FAF8FF] dark:bg-[#120F26] text-[#17133A] dark:text-[#FAF8FF] antialiased">
      {/* Desktop Mode Switcher Banner (Shows only on large screens) */}
      <div className="hidden lg:flex items-center justify-between px-6 py-2 bg-[#6D28D9] text-white text-xs select-none shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-tight">ElderCare OS</span>
          <span className="opacity-80">• Reference-Accurate Mobile UX</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileFrameView(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              isMobileFrameView
                ? "bg-white text-[#6D28D9] shadow-2xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Mobile Device Frame</span>
          </button>

          <button
            onClick={() => setIsMobileFrameView(false)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              !isMobileFrameView
                ? "bg-white text-[#6D28D9] shadow-2xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Full Responsive View</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div
        className={`w-full min-h-screen transition-all ${
          isMobileFrameView
            ? "max-w-md mx-auto bg-white shadow-2xl border-x border-[#E8E1F5] dark:border-[#2C2554] dark:bg-[#120F26] relative"
            : "max-w-4xl mx-auto px-4"
        }`}
      >
        {/* Mobile Header */}
        <MobileHeader onOpenDrawer={() => setIsDrawerOpen(true)} />

        {/* Dynamic Page Content */}
        <main className="pb-24 pt-4 px-4 sm:px-5">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (5 Items) */}
        <MobileBottomNav
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />

        {/* Mobile Drawer Navigation (Side Menu) */}
        <MobileDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />

        {/* Quick Action Floating Sheet (Triggered by central + button) */}
        <QuickActionSheet
          isOpen={isQuickActionOpen}
          onClose={() => setIsQuickActionOpen(false)}
        />
      </div>
    </div>
  );
}
