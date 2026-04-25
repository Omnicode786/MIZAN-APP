"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { UiModeToggle } from "@/components/ui-mode-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";

export function Topbar({
  user
}: {
  user: { name: string; role: string } | null;
}) {
  const language = useLanguage();
  const displayUser = user || { name: "MIZAN user", role: "USER" };

  return (
    <div className="app-topbar sticky top-0 z-30 px-4 py-3 sm:px-6 lg:px-8">
      <GlassSurface
        className="mx-auto w-full max-w-[1600px]"
        borderRadius={28}
        backgroundOpacity={0.14}
        blur={14}
        saturation={1.4}
        innerClassName="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5"
      >
        <div className="topbar-search relative hidden max-w-xl flex-1 md:block">
          <Search className="topbar-search-icon pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="topbar-search-input h-11 border-white/30 bg-white/25 pl-10 dark:bg-white/5"
            placeholder={t(language, "searchPlaceholder")}
          />
        </div>

        <div className="topbar-actions ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <UiModeToggle />
          <ThemeToggle />
          <LanguageToggle compact />
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/notifications">
              <Bell className="h-4 w-4" />
            </Link>
          </Button>
          <div className="glass-subtle flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2 transition-colors duration-300">
            <Avatar name={displayUser.name} className="h-9 w-9 text-xs" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium">{displayUser.name}</p>
              <p className="text-xs text-muted-foreground">{displayUser.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </GlassSurface>
    </div>
  );
}
