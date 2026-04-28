export const THEME_PRESETS = [
  { value: "original", label: "original theme", source: "MIZAN" },
  { value: "amber-minimal", label: "amber-minimal", source: "TweakCN" },
  { value: "bold-tech", label: "bold-tech", source: "TweakCN" },
  { value: "bubblegum", label: "bubblegum", source: "TweakCN" },
  { value: "caffeine", label: "caffeine", source: "TweakCN" },
  { value: "catppuccin", label: "catppuccin", source: "TweakCN" },
  { value: "claymorphism", label: "claymorphism", source: "TweakCN" },
  { value: "cosmic-night", label: "cosmic-night", source: "TweakCN" },
  { value: "cyberpunk", label: "cyberpunk", source: "TweakCN" },
  { value: "t3-chat", label: "t3-chat", source: "TweakCN" },
  { value: "vintage-paper", label: "vintage-paper", source: "TweakCN" }
] as const;

export type ThemePreset = (typeof THEME_PRESETS)[number]["value"];

export function isThemePreset(value: string | null | undefined): value is ThemePreset {
  return THEME_PRESETS.some((preset) => preset.value === value);
}

