"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, PanelLeftOpen, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FrostedSurface } from "@/components/ui/frosted-surface";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { resolveSidebarIcon, type NavItem } from "@/components/workspace/sidebar";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { cn } from "@/lib/utils";

const MOBILE_DRAWER_ANIMATION_MS = 280;

export function Topbar({
  user,
  nav = [],
  currentPath
}: {
  user: { name: string; role: string } | null;
  nav?: NavItem[];
  currentPath?: string;
}) {
  const language = useLanguage();
  const displayUser = user || { name: "MIZAN user", role: "USER" };
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileNavMounted, setMobileNavMounted] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const { uiMode } = useTheme();
  const router = useRouter();
  const isLiquidGlass = uiMode === "glass";
  const [isMobileGlassViewport, setIsMobileGlassViewport] = useState(false);

  function openMobileNav() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMobileNavMounted(true);
    window.requestAnimationFrame(() => setMobileNavOpen(true));
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setMobileNavMounted(false);
      closeTimerRef.current = null;
    }, MOBILE_DRAWER_ANIMATION_MS);
  }

  function toggleMobileNav() {
    if (mobileNavMounted && mobileNavOpen) {
      closeMobileNav();
      return;
    }

    openMobileNav();
  }

  useEffect(() => {
    if (!mobileNavMounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobileNav();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavMounted]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateMobileViewport = () => setIsMobileGlassViewport(mediaQuery.matches);

    updateMobileViewport();
    mediaQuery.addEventListener("change", updateMobileViewport);

    return () => mediaQuery.removeEventListener("change", updateMobileViewport);
  }, []);

  const liquidGlassTopbarProps = isMobileGlassViewport
    ? {
        borderWidth: 0.26,
        backgroundOpacity: 0.12,
        brightness: 42,
        opacity: 0.97,
        blur: 15,
        displace: 4.8,
        distortionScale: -250,
        redOffset: -12,
        greenOffset: 22,
        blueOffset: 42,
        saturation: 1.62
      }
    : {
        borderWidth: 0.1,
        backgroundOpacity: 0.08,
        brightness: 49,
        opacity: 0.92,
        blur: 11,
        displace: 2.4,
        distortionScale: -180,
        redOffset: 0,
        greenOffset: 10,
        blueOffset: 20,
        saturation: 1.3
      };

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

  const topbarContent = (
    <div className="flex min-h-14 w-full min-w-0 flex-wrap items-center gap-2 px-2 py-1.5 sm:min-h-16 sm:gap-2.5 sm:px-3 xl:flex-nowrap xl:px-4">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={toggleMobileNav}
        aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileNavOpen}
      >
        {mobileNavOpen ? <X className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </Button>

      <div className="topbar-search relative order-3 hidden w-full flex-none md:order-none md:block md:min-w-[220px] md:flex-1 lg:max-w-lg xl:max-w-xl">
        <Search className="topbar-search-icon pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="topbar-search-input h-10 border-white/30 bg-white/25 pl-10 dark:bg-white/5"
          placeholder={t(language, "searchPlaceholder")}
        />
      </div>

      <div className="topbar-actions ml-auto flex max-w-full min-w-0 items-center justify-end gap-1.5 overflow-x-auto overscroll-x-contain py-0.5 sm:gap-2 md:max-w-[64vw] lg:max-w-[54vw] xl:max-w-none">
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
          className="hidden shrink-0 sm:inline-flex"
          onClick={logout}
          disabled={loggingOut}
          title={loggingOut ? "Logging out" : t(language, "logout")}
          aria-label={t(language, "logout")}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const mobileDrawerContent = (
    <FrostedSurface
      className="workspace-mobile-drawer-surface h-full w-full"
      width="100%"
      height="100%"
      borderRadius={0}
      borderGlow
      innerClassName="flex h-full min-h-0 w-full flex-col"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-4">
        <Logo />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={closeMobileNav}
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="premium-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-32 pt-4">
        <div className="glass-subtle flex items-center gap-3 rounded-3xl p-3">
          <Avatar name={displayUser.name} className="h-11 w-11 text-sm" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{displayUser.name}</p>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {displayUser.role.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="topbar-search relative w-full">
            <Search className="topbar-search-icon pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="topbar-search-input h-12 rounded-2xl border-white/30 bg-white/25 pl-10 dark:bg-white/5"
              placeholder={t(language, "searchPlaceholder")}
            />
          </div>
          <LanguageToggle compact />
        </div>

        <nav className="grid gap-2">
          {nav.map((item) => {
            const active = currentPath === item.href || currentPath?.startsWith(`${item.href}/`);
            const label = item.translationKey ? t(language, item.translationKey) : item.label;
            const Icon = resolveSidebarIcon(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileNav}
                className={cn(
                  "group flex min-h-14 items-center gap-3 rounded-3xl px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_16px_34px_hsl(var(--primary)/0.26)]"
                    : "glass-subtle text-muted-foreground hover:translate-x-1 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition",
                    active ? "bg-white/18" : "bg-background/50 group-hover:bg-background/70"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-2 border-t border-border/70 pt-4">
          <Button asChild variant="outline" className="h-12 justify-start rounded-2xl">
            <Link href="/notifications" onClick={closeMobileNav}>
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 justify-start rounded-2xl"
            onClick={logout}
            disabled={loggingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {loggingOut ? "Logging out..." : t(language, "logout")}
          </Button>
        </div>
      </div>
    </FrostedSurface>
  );

  return (
    <div className="app-topbar relative z-50 isolate shrink-0 bg-transparent px-2 py-2 sm:px-4 lg:px-6 xl:px-8">
      {isLiquidGlass ? (
        <GlassSurface
          className="nav-surface glass-border-glow workspace-glass-topbar mx-auto w-full max-w-[1600px] border border-white/45"
          width="100%"
          height="auto"
          borderRadius={30}
          borderWidth={liquidGlassTopbarProps.borderWidth}
          backgroundOpacity={liquidGlassTopbarProps.backgroundOpacity}
          brightness={liquidGlassTopbarProps.brightness}
          opacity={liquidGlassTopbarProps.opacity}
          blur={liquidGlassTopbarProps.blur}
          displace={liquidGlassTopbarProps.displace}
          distortionScale={liquidGlassTopbarProps.distortionScale}
          redOffset={liquidGlassTopbarProps.redOffset}
          greenOffset={liquidGlassTopbarProps.greenOffset}
          blueOffset={liquidGlassTopbarProps.blueOffset}
          mixBlendMode="screen"
          saturation={liquidGlassTopbarProps.saturation}
        >
          {topbarContent}
        </GlassSurface>
      ) : (
        <FrostedSurface
          className="workspace-classic-topbar mx-auto w-full max-w-[1600px]"
          width="100%"
          height="auto"
          borderRadius={30}
          borderGlow
          innerClassName="flex h-full w-full items-center justify-center p-2"
        >
          {topbarContent}
        </FrostedSurface>
      )}

      {mobileNavMounted ? (
        <div
          className={cn(
            "workspace-mobile-drawer fixed inset-0 z-[80] lg:hidden",
            mobileNavOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation"
          aria-hidden={!mobileNavOpen}
        >
          <button
            type="button"
            className={cn(
              "absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-300",
              mobileNavOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={closeMobileNav}
            aria-label="Close navigation backdrop"
          />
          <div
            className={cn(
              "absolute inset-y-0 left-0 h-full w-full transform transition-transform duration-300 ease-out",
              mobileNavOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            {mobileDrawerContent}
          </div>
        </div>
      ) : null}
    </div>
  );
}
