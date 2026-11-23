"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between items-center max-w-md mx-auto relative overflow-hidden select-none">
      {/* Top Header with Centered Brand Logo */}
      <div className="w-full pt-6 pb-2 px-6 flex flex-col items-center text-center">
        <Logo size="md" showText={true} />
      </div>

      {/* Hero Elderly Couple Photo matching Reference Image Screen 1 */}
      <div className="w-full px-6 pt-2">
        <div className="w-full rounded-[32px] overflow-hidden shadow-card border-2 border-white relative aspect-[4/3] bg-gradient-to-br from-purple-100 to-purple-50">
          <img
            src="https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=800&auto=format&fit=crop&q=80"
            alt="Happy Elderly Couple at Old Age Home"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-950/20 via-transparent to-transparent" />
        </div>
      </div>

      {/* Main Content Area in White Curved Container */}
      <div className="w-full bg-white rounded-t-[36px] shadow-soft border-t border-[#E8E1F5] px-6 pt-6 pb-4 mt-2 space-y-4 text-center">
        <h1 className="text-2xl font-black tracking-tight text-[#17133A] leading-tight">
          Complete Care<br />
          for a <span className="text-[#6D28D9]">Better Life</span> in Old Age
        </h1>

        <p className="text-xs text-[#686581] leading-relaxed max-w-xs mx-auto">
          Manage residents, healthcare, daily care, operations and paperwork — all in one place.
        </p>

        {/* Carousel Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          <span className="h-2 w-6 rounded-full bg-[#6D28D9]" />
          <span className="h-2 w-2 rounded-full bg-[#E8E1F5]" />
          <span className="h-2 w-2 rounded-full bg-[#E8E1F5]" />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <Link href="/login" className="block w-full">
            <Button
              className="w-full h-12 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:opacity-95 text-white font-bold text-sm rounded-2xl shadow-soft flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/login" className="block w-full">
            <button
              type="button"
              className="w-full h-12 rounded-2xl border border-[#E8E1F5] bg-white text-xs font-bold text-[#17133A] hover:bg-[#FAF8FF] transition-colors shadow-2xs"
            >
              I already have an account
            </button>
          </Link>
        </div>

        {/* Bottom Graphic: Ashram Home, Walking Seniors & Nature */}
        <div className="w-full pt-2 opacity-95">
          <svg
            viewBox="0 0 320 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full max-h-16 mx-auto"
          >
            {/* Grassy ground curve */}
            <path
              d="M0 50C70 42 140 56 220 46C270 40 300 48 320 46V65H0V50Z"
              fill="#F3E8FF"
            />
            {/* Left Tree */}
            <circle cx="36" cy="38" r="12" fill="#86EFAC" fillOpacity="0.8" />
            <rect x="34" y="46" width="4" height="12" fill="#78716C" rx="1" />
            {/* Ashram building */}
            <path d="M56 34L78 20L100 34V56H56V34Z" fill="#DDD6FE" />
            <path d="M54 34L78 18L102 34" stroke="#6D28D9" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="73" y="40" width="10" height="16" fill="#6D28D9" rx="1.5" />
            <rect x="62" y="36" width="6" height="6" fill="#FAF8FF" rx="1" />
            <rect x="88" y="36" width="6" height="6" fill="#FAF8FF" rx="1" />
            {/* Walking Seniors Silhouette */}
            <circle cx="152" cy="33" r="3" fill="#6D28D9" />
            <path d="M152 36V48L149 58M152 48L155 58" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round" />
            {/* Walking Cane */}
            <path d="M146 44V58" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
            {/* Partner */}
            <circle cx="163" cy="34" r="3" fill="#8B5CF6" />
            <path d="M163 37V48L160 58M163 48L166 58" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
            {/* Right Tree */}
            <circle cx="218" cy="36" r="11" fill="#86EFAC" fillOpacity="0.8" />
            <rect x="216" y="44" width="4" height="14" fill="#78716C" rx="1" />
          </svg>
        </div>
      </div>
    </div>
  );
}
