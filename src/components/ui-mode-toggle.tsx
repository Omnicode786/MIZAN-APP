"use client";

import { Layers3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function UiModeToggle({
  compact = false,
  className
}: {
  compact?: boolean;
  className?: string;
}) {
  const { mounted, uiMode, toggleUiMode } = useTheme();
  const isGlass = mounted ? uiMode === "glass" : true;
  const nextModeLabel = isGlass ? "Classic style" : "Liquid glass";
  const nextModeTitle = isGlass ? "Switch back to classic style" : "Switch to liquid glass UI";

  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggleUiMode}
      aria-label={nextModeTitle}
      aria-pressed={isGlass}
      title={nextModeTitle}
      className={cn(
        "shrink-0",
        compact ? "h-8 rounded-xl px-2.5 text-[13px]" : "h-10 rounded-2xl px-3.5",
        className
      )}
    >
      {isGlass ? <Layers3 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      <span className={cn(compact ? "hidden 2xl:inline" : "hidden xl:inline")}>
        {nextModeLabel}
      </span>
    </Button>
  );
}
