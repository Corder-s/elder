import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
  label = "Loading records...",
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 gap-3", className)}>
      <Loader2 className={cn("animate-spin text-teal-600 dark:text-teal-400", sizeMap[size])} />
      {label && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
}

