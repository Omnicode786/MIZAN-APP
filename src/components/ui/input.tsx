import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm outline-none ring-offset-background shadow-sm transition placeholder:text-muted-foreground/90 focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
