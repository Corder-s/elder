import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-md shadow-purple-900/15 hover:opacity-95 active:scale-[0.98]",
        purple:
          "bg-[#6D28D9] text-white hover:bg-[#5B21B6] active:scale-[0.98]",
        secondary:
          "bg-[#F3E8FF] text-[#6D28D9] hover:bg-[#E9D5FF] dark:bg-purple-950/60 dark:text-purple-300",
        outline:
          "border border-[#E8E1F5] bg-white text-[#17133A] hover:bg-[#FAF8FF] dark:border-[#2C2554] dark:bg-[#1B1638] dark:text-[#FAF8FF]",
        ghost:
          "text-[#686581] hover:bg-[#F3E8FF] hover:text-[#6D28D9] dark:text-purple-300 dark:hover:bg-purple-950/50",
        destructive:
          "bg-[#E11D48] text-white hover:bg-[#BE123C] active:scale-[0.98]",
        link: "text-[#6D28D9] underline-offset-4 hover:underline dark:text-purple-400",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-13 rounded-2xl px-7 text-base font-bold",
        icon: "h-10 w-10 rounded-2xl",
        pill: "h-11 rounded-full px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
