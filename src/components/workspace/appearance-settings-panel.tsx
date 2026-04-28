"use client";

import { CheckCircle2, Layers3, Monitor, MoonStar, Palette, Sparkles, SunMedium } from "lucide-react";
import { useTheme, type ThemeSetting, type UiMode } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { THEME_PRESETS, type ThemePreset } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";

const themeModes: Array<{
  value: ThemeSetting;
  label: string;
  description: string;
  icon: typeof SunMedium;
}> = [
  {
    value: "system",
    label: "System",
    description: "Follow your device appearance automatically.",
    icon: Monitor
  },
  {
    value: "light",
    label: "Light",
    description: "Bright workspace for daytime legal review.",
    icon: SunMedium
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low-glare workspace for long research sessions.",
    icon: MoonStar
  }
];

const uiModes: Array<{
  value: UiMode;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    value: "glass",
    label: "Liquid glass",
    description: "Frosted panels, refractive navigation, and premium depth.",
    icon: Sparkles
  },
  {
    value: "classic",
    label: "Classic",
    description: "Cleaner solid surfaces with restrained motion and contrast.",
    icon: Layers3
  }
];

const presetPreviewColors: Record<ThemePreset, string[]> = {
  original: ["#2563eb", "#0f766e", "#d97706"],
  "amber-minimal": ["#f59e0b", "#fde68a", "#78350f"],
  "bold-tech": ["#8b5cf6", "#0ea5e9", "#a21caf"],
  bubblegum: ["#ec4899", "#22d3ee", "#c084fc"],
  caffeine: ["#8b5e34", "#d6bd8d", "#5c4033"],
  catppuccin: ["#cba6f7", "#89dceb", "#f5c2e7"],
  claymorphism: ["#fdba74", "#93c5fd", "#fb7185"],
  "cosmic-night": ["#7c3aed", "#06b6d4", "#db2777"],
  cyberpunk: ["#22d3ee", "#ff3ea5", "#facc15"],
  "t3-chat": ["#e11d48", "#8b5cf6", "#f59e0b"],
  "vintage-paper": ["#c0843e", "#8a4b2f", "#f5e6b8"]
};

export function AppearanceSettingsPanel() {
  const {
    mounted,
    theme,
    resolvedTheme,
    uiMode,
    themePreset,
    setTheme,
    setUiMode,
    setThemePreset
  } = useTheme();

  const selectedTheme = mounted ? theme : "system";
  const selectedResolvedTheme = mounted ? resolvedTheme : "light";
  const selectedUiMode = mounted ? uiMode : "glass";
  const selectedPreset = mounted ? themePreset : "original";

  return (
    <Tabs defaultValue="appearance" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="glass-subtle h-auto w-full justify-start overflow-x-auto rounded-2xl p-1 sm:w-fit">
          <TabsTrigger value="appearance" className="rounded-xl px-4 py-2 text-sm font-semibold">
            Appearance
          </TabsTrigger>
          <TabsTrigger value="workspace" className="rounded-xl px-4 py-2 text-sm font-semibold">
            Workspace
          </TabsTrigger>
        </TabsList>
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
          {selectedPreset} / {selectedResolvedTheme} / {selectedUiMode}
        </Badge>
      </div>

      <TabsContent value="appearance" className="mt-0 flex flex-col gap-5">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Control Mizan&apos;s visual theme, dark mode behavior, and classic or liquid glass workspace style.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="w-fit rounded-full">
                TweakCN themes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold">Color theme</h3>
                <p className="text-sm text-muted-foreground">
                  Pick the original Mizan look or one of the installed TweakCN-inspired presets.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {THEME_PRESETS.map((preset) => (
                  <PresetOption
                    key={preset.value}
                    preset={preset}
                    active={selectedPreset === preset.value}
                    onSelect={() => setThemePreset(preset.value)}
                  />
                ))}
              </div>
            </section>

            <Separator />

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Dark and light mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a fixed mode or let your operating system decide.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                  {themeModes.map((option) => (
                    <ThemeModeOption
                      key={option.value}
                      label={option.label}
                      description={option.description}
                      icon={option.icon}
                      active={selectedTheme === option.value}
                      onSelect={() => setTheme(option.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Workspace surface style</h3>
                  <p className="text-sm text-muted-foreground">
                    Switch between premium liquid glass and simpler classic UI surfaces.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {uiModes.map((option) => (
                    <UiModeOption
                      key={option.value}
                      label={option.label}
                      description={option.description}
                      icon={option.icon}
                      active={selectedUiMode === option.value}
                      onSelect={() => setUiMode(option.value)}
                    />
                  ))}
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="workspace" className="mt-0">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Preferences</CardTitle>
            <CardDescription>
              Appearance settings are available now. Additional account, notification, and workspace controls can live here without crowding the topbar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="glass-subtle rounded-3xl p-5 text-sm leading-6 text-muted-foreground">
              Your theme choices are saved on this device and apply across the client and lawyer workspace.
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function PresetOption({
  preset,
  active,
  onSelect
}: {
  preset: (typeof THEME_PRESETS)[number];
  active: boolean;
  onSelect: () => void;
}) {
  const swatches = presetPreviewColors[preset.value];

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "h-auto justify-start rounded-3xl p-4 text-left",
        active && "border-primary bg-primary/10 text-foreground shadow-soft"
      )}
    >
      <span className="flex w-full min-w-0 flex-col gap-4">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{preset.label}</span>
            <span className="block text-xs text-muted-foreground">{preset.source}</span>
          </span>
          {active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
        </span>
        <span className="flex h-10 overflow-hidden rounded-2xl border border-border/70">
          {swatches.map((color) => (
            <span key={color} className="h-full flex-1" style={{ backgroundColor: color }} />
          ))}
        </span>
      </span>
    </Button>
  );
}

function ThemeModeOption({
  label,
  description,
  icon: Icon,
  active,
  onSelect
}: {
  label: string;
  description: string;
  icon: typeof SunMedium;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "h-auto justify-start rounded-3xl p-4 text-left",
        active && "border-primary bg-primary/10 text-foreground shadow-soft"
      )}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="glass-subtle flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block whitespace-normal text-xs leading-5 text-muted-foreground">{description}</span>
        </span>
      </span>
    </Button>
  );
}

function UiModeOption({
  label,
  description,
  icon: Icon,
  active,
  onSelect
}: {
  label: string;
  description: string;
  icon: typeof Sparkles;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "h-auto justify-start rounded-3xl p-4 text-left",
        active && "border-primary bg-primary/10 text-foreground shadow-soft"
      )}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", active ? "bg-primary text-primary-foreground" : "glass-subtle")}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block whitespace-normal text-xs leading-5 text-muted-foreground">{description}</span>
        </span>
      </span>
    </Button>
  );
}
