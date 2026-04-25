import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[120px] w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground outline-none ring-offset-background shadow-sm transition-colors duration-200 placeholder:text-muted-foreground/90 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/80 dark:shadow-none",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
