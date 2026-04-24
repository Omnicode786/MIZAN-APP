import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[120px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none ring-offset-background shadow-sm transition placeholder:text-muted-foreground/90 focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
