import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex max-w-full min-w-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-3 py-1 text-center text-[11px] font-medium leading-4 tracking-[0.01em] shadow-sm transition-[background-color,border-color,color,box-shadow]",
  {
    variants: {
      variant: {
        default: "border-primary/10 bg-primary/10 text-primary dark:border-primary/15 dark:bg-primary/14",
        secondary: "border-border/50 bg-secondary/90 text-secondary-foreground dark:bg-secondary/75",
        outline: "border-border/70 bg-background/72 text-foreground dark:bg-card/75",
        success: "border-emerald-500/10 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        warning: "border-amber-500/10 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        destructive: "border-rose-500/10 bg-rose-500/10 text-rose-700 dark:text-rose-400"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        "text-wrap-safe whitespace-normal",
        className
      )}
      {...props}
    />
  );
}
