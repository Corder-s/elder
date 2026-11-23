import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className = "", size = "md", showText = true }: LogoProps) {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-11 w-11",
    lg: "h-14 w-14",
  };

  const textMap = {
    sm: { title: "text-base", subtitle: "text-[9px]" },
    md: { title: "text-lg", subtitle: "text-[10px]" },
    lg: { title: "text-2xl", subtitle: "text-xs" },
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Visual House & Caring Hands Icon matching reference */}
      <div
        className={`${sizeMap[size]} shrink-0 relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FAF8FF] to-[#F3E8FF] border border-[#E8E1F5] shadow-sm`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4/5 h-4/5"
        >
          {/* House Roof & Outline in Deep Purple */}
          <path
            d="M24 7L8 19V39C8 40.1 8.9 41 10 41H38C39.1 41 40 40.1 40 39V19L24 7Z"
            stroke="#6D28D9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Elderly Couple Silhouettes inside */}
          {/* Figure 1: Senior Left */}
          <circle cx="19" cy="22" r="3" fill="#6D28D9" />
          <path
            d="M14 32C14 28 17 27 19 27C21 27 24 28 24 32"
            stroke="#6D28D9"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Figure 2: Senior Right with bun/cane */}
          <circle cx="29" cy="22" r="3" fill="#8B5CF6" />
          <path
            d="M25 32C25 28 27.5 27 29 27C30.5 27 34 28 34 32"
            stroke="#8B5CF6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Caring Supportive Hands in Golden Amber */}
          <path
            d="M6 34C8 38 14 43 24 43C34 43 40 38 42 34"
            stroke="#F59E0B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center">
            <span className={`font-black tracking-tight text-[#17133A] dark:text-[#FAF8FF] ${textMap[size].title}`}>
              ElderCare
            </span>
            <span className={`font-black tracking-tight text-[#6D28D9] dark:text-[#8B5CF6] ml-0.5 ${textMap[size].title}`}>
              OS
            </span>
          </div>
          <span className={`font-semibold uppercase tracking-wider text-[#686581] dark:text-[#9D99BA] ${textMap[size].subtitle}`}>
            Old Age Home Management
          </span>
        </div>
      )}
    </div>
  );
}
