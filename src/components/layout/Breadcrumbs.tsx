"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  const pathSegments = pathname.split("/").filter(Boolean);

  const getSegmentLabel = (segment: string) => {
    switch (segment) {
      case "residents":
        return "Residents";
      case "rescue-cases":
        return "Rescue Cases";
      case "admissions":
        return "Admissions";
      case "medical-records":
        return "Medical Records";
      case "medicines":
        return "Medicines";
      case "attendance":
        return "Attendance";
      case "visitors":
        return "Visitors";
      case "staff":
        return "Staff & Volunteers";
      case "facilities":
        return "Rooms & Facilities";
      case "events":
        return "Events & Calendar";
      case "diary":
        return "Daily Diary";
      case "documents":
        return "Document Vault";
      case "finance":
        return "Donations & Finance";
      case "tasks":
        return "Tasks & Reminders";
      case "reports":
        return "Reports & Exports";
      case "settings":
        return "System Settings";
      default:
        return decodeURIComponent(segment).replace(/-/g, " ");
    }
  };

  return (
    <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-5 select-none" aria-label="Breadcrumb">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Home</span>
      </Link>

      {pathSegments.map((segment, index) => {
        const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
        const isLast = index === pathSegments.length - 1;
        const label = getSegmentLabel(segment);

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3 w-3 mx-1.5 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors capitalize"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

