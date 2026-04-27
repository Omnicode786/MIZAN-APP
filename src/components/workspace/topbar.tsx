"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { UiModeToggle } from "@/components/ui-mode-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { t, type TranslationKey } from "@/lib/translations";
import { cn } from "@/lib/utils";

export function Topbar({
  user,
  nav = [],
  currentPath
}: {
  user: { name: string; role: string } | null;
  nav?: Array<{ href: string; label: string; translationKey?: TranslationKey }>;
  currentPath?: string;
}) {
  const language = useLanguage();
  const displayUser = user || { name: "MIZAN user", role: "USER" };
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store"
        }
      });
    } finally {
      try {
        window.sessionStorage.clear();
      } catch {
        // Browser storage may be unavailable in private contexts.
      }
      router.refresh();
      window.location.replace("/login");
    }
  }

  return (
    <div className="app-topbar sticky top-0 z-30 px-3 py-2 sm:px-5 lg:px-8">
      <GlassSurface
        className="nav-surface mx-auto w-full max-w-[1600px]"
        height={64}
        borderRadius={28}
        borderWidth={0.14}
        borderGlow
        refractive
        backgroundOpacity={0.045}
        brightness={50}
        opacity={0.52}
        blur={11}
        displace={0.46}
        distortionScale={-190}
        redOffset={0}
        greenOffset={10}
        blueOffset={22}
        mixBlendMode="screen"
        saturation={1.34}
        innerClassName="flex h-full min-w-0 items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-4"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
        >
          {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        <div className="topbar-search relative hidden max-w-xl flex-1 md:block">
          <Search className="topbar-search-icon pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="topbar-search-input h-10 border-white/30 bg-white/25 pl-10 dark:bg-white/5"
            placeholder={t(language, "searchPlaceholder")}
          />
        </div>

        <div className="topbar-actions ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="hidden min-[420px]:block">
            <UiModeToggle />
          </div>
          <ThemeToggle />
          <div className="hidden sm:block">
            <LanguageToggle compact />
          </div>
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/notifications">
              <Bell className="h-4 w-4" />
            </Link>
          </Button>
          <div className="glass-subtle flex min-w-0 items-center gap-2.5 rounded-2xl px-2.5 py-1.5 transition-colors duration-300">
            <Avatar name={displayUser.name} className="h-8 w-8 text-xs" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium">{displayUser.name}</p>
              <p className="text-xs text-muted-foreground">{displayUser.role.toLowerCase()}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={logout}
            disabled={loggingOut}
            title={loggingOut ? "Logging out" : t(language, "logout")}
            aria-label={t(language, "logout")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </GlassSurface>
      {mobileNavOpen ? (
        <div className="fixed inset-x-3 top-[78px] z-40 lg:hidden">
          <GlassSurface
            className="w-full overflow-hidden"
            borderRadius={28}
            borderWidth={0.12}
            borderGlow
            backgroundOpacity={0.08}
            blur={14}
            saturation={1.28}
            innerClassName="max-h-[calc(100vh-96px)] overflow-y-auto p-3"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <UiModeToggle />
                <ThemeToggle />
              </div>
              <LanguageToggle compact />
              <nav className="grid gap-2 pt-1">
                {nav.map((item) => {
                  const active = currentPath === item.href || currentPath?.startsWith(`${item.href}/`);
                  const label = item.translationKey ? t(language, item.translationKey) : item.label;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm font-medium transition",
                        active
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "glass-subtle text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </GlassSurface>
        </div>
      ) : null}
    </div>
  );
}
