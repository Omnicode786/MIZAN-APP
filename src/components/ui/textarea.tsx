import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[120px] w-full rounded-2xl border border-border/70 bg-card/92 px-4 py-3 text-sm leading-6 text-foreground outline-none ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/90 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-ring/70 dark:bg-input/82 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
