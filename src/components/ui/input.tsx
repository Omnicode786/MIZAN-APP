import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-2xl border border-border bg-card px-4 py-2 text-sm text-foreground outline-none ring-offset-background shadow-sm transition-colors duration-200 placeholder:text-muted-foreground/90 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/80 dark:shadow-none",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
