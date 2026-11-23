import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#6D28D9] text-white",
        secondary:
          "border-transparent bg-[#F3E8FF] text-[#6D28D9] dark:bg-purple-950/60 dark:text-purple-300",
        outline:
          "text-[#686581] border-[#E8E1F5] dark:text-[#9D99BA] dark:border-[#2C2554]",
        success:
          "border-transparent bg-[#DCFCE7] text-[#16A34A] dark:bg-green-950/70 dark:text-green-300",
        warning:
          "border-transparent bg-[#FEF3C7] text-[#D97706] dark:bg-amber-950/70 dark:text-amber-300",
        danger:
          "border-transparent bg-[#FFE4E6] text-[#E11D48] dark:bg-rose-950/70 dark:text-rose-300",
        destructive:
          "border-transparent bg-[#FFE4E6] text-[#E11D48] dark:bg-rose-950/70 dark:text-rose-300",
        info:
          "border-transparent bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/70 dark:text-sky-300",
        purple:
          "border-transparent bg-[#F3E8FF] text-[#6D28D9]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
