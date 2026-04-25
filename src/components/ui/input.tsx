import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-2xl border border-border/70 bg-card/92 px-4 py-2 text-sm text-foreground outline-none ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/90 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-ring/70 dark:bg-input/82 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
