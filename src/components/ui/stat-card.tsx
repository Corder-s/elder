import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon: React.ReactNode;
  iconBgColor?: string;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  iconBgColor = "bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400",
  className,
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
        onClick && "cursor-pointer hover:border-teal-500/50",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBgColor)}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <h4 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {value}
        </h4>
        {(description || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={cn(
                  "font-medium",
                  trend.positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {trend.value}
              </span>
            )}
            {description && (
              <span className="text-slate-500 dark:text-slate-400">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

