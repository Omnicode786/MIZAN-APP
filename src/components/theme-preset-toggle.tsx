"use client";

import { Palette } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { THEME_PRESETS, type ThemePreset } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";

export function ThemePresetToggle({
  compact = false,
  className
}: {
  compact?: boolean;
  className?: string;
}) {
  const { mounted, themePreset, setThemePreset } = useTheme();
  const selectedPreset = mounted ? themePreset : "original";

  return (
    <label
      className={cn(
        "glass-chip group inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-2xl border px-3 text-sm text-foreground transition",
        compact ? "h-8 max-w-[150px]" : "h-10 max-w-[210px]",
        className
      )}
      title="Switch visual theme"
    >
      <Palette className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
      <span className="sr-only">Theme preset</span>
      <select
        value={selectedPreset}
        onChange={(event) => setThemePreset(event.target.value as ThemePreset)}
        className={cn(
          "min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent p-0 text-sm font-medium outline-none",
          "text-foreground focus-visible:ring-0",
          compact && "text-[13px]"
        )}
        aria-label="Theme preset"
      >
        {THEME_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}

