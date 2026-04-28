"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
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
    <div className="app-topbar sticky top-0 z-50 isolate shrink-0 px-2 py-2 sm:px-4 lg:px-6 xl:px-8">
      <div
        aria-hidden="true"
        className="workspace-glass-topbar-glue pointer-events-none absolute inset-x-3 top-1 h-[86px] rounded-[2rem] transition-opacity duration-300 sm:inset-x-6 lg:inset-x-8"
      />
      <GlassSurface
        className="nav-surface workspace-glass-topbar mx-auto w-full max-w-[1600px]"
        height="auto"
        borderRadius={30}
        borderWidth={0.18}
        borderGlow
        refractive
        backgroundOpacity={0.12}
        brightness={56}
        opacity={0.66}
        blur={16}
        displace={0.58}
        distortionScale={-220}
        redOffset={0}
        greenOffset={10}
        blueOffset={22}
        mixBlendMode="screen"
        saturation={1.46}
        innerClassName="flex min-h-16 w-full min-w-0 flex-wrap items-center gap-2 px-2.5 py-2 sm:min-h-[68px] sm:gap-2.5 sm:px-4 xl:flex-nowrap"
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

        <div className="topbar-search order-3 hidden w-full flex-none md:order-none md:block md:min-w-[220px] md:flex-1 lg:max-w-lg xl:max-w-xl">
          <Search className="topbar-search-icon pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="topbar-search-input h-10 border-white/30 bg-white/25 pl-10 dark:bg-white/5"
            placeholder={t(language, "searchPlaceholder")}
          />
        </div>

        <div className="topbar-actions ml-auto flex max-w-full min-w-0 items-center justify-end gap-1.5 overflow-x-auto overscroll-x-contain py-0.5 sm:gap-2 md:max-w-[70vw] xl:max-w-none">
          <div className="hidden md:block">
            <LanguageToggle compact />
          </div>
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/notifications">
              <Bell className="h-4 w-4" />
            </Link>
          </Button>
          <div className="glass-subtle flex min-w-0 items-center gap-2.5 rounded-2xl px-2.5 py-1.5 transition-colors duration-300">
            <Avatar name={displayUser.name} className="h-8 w-8 text-xs" />
            <div className="hidden min-w-0 xl:block">
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
        <div className="fixed inset-x-2 top-20 z-40 sm:inset-x-4 lg:hidden">
          <GlassSurface
            className="workspace-glass-mobile-panel w-full overflow-hidden"
            borderRadius={30}
            borderWidth={0.16}
            borderGlow
            refractive
            backgroundOpacity={0.13}
            brightness={56}
            opacity={0.64}
            blur={18}
            displace={0.42}
            distortionScale={-200}
            mixBlendMode="screen"
            saturation={1.42}
            innerClassName="max-h-[calc(100vh-96px)] overflow-y-auto p-3"
          >
            <div className="space-y-3">
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
