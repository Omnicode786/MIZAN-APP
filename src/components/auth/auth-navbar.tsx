"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";
import { ThemePresetToggle } from "@/components/theme-preset-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { UiModeToggle } from "@/components/ui-mode-toggle";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";

type AuthNavbarProps = {
  mode: "login" | "signup";
};

export function AuthNavbar({ mode }: AuthNavbarProps) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const language = useLanguage();
  const isLogin = mode === "login";

  const primaryHref = isLogin ? "/signup" : "/lawyers";
  const primaryLabel = isLogin ? t(language, "signup") : t(language, "browseLawyers");
  const secondaryHref = isLogin ? "/lawyers" : "/login";
  const secondaryLabel = isLogin ? t(language, "lawyers") : t(language, "login");

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let frame = 0;

    const updateNavbar = () => {
      frame = 0;
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY < 24 || delta < -4) {
        setHidden(false);
      } else if (delta > 8 && currentScrollY > 96) {
        setHidden(true);
      }

      lastScrollY = currentScrollY;
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateNavbar);
    };

    const handleWheel = (event: WheelEvent) => {
      const projectedScrollY = window.scrollY + event.deltaY;

      if (event.deltaY < -4 || projectedScrollY < 24) {
        setHidden(false);
      } else if (event.deltaY > 8 && projectedScrollY > 96) {
        setHidden(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("wheel", handleWheel);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div className={`prelogin-navbar-shell px-5 py-6 md:px-6 md:py-8 ${hidden && !open ? "prelogin-navbar-hidden" : ""}`}>
        <div className="mx-auto max-w-7xl">
          <GlassSurface
            className="preauth-navbar nav-surface rounded-[1.35rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur-xl lg:rounded-full"
            width="100%"
            height="auto"
            borderRadius={999}
            borderWidth={0.07}
            brightness={50}
            opacity={0.93}
            blur={11}
            displace={0.28}
            backgroundOpacity={0.12}
            saturation={1.14}
            distortionScale={-160}
            mixBlendMode="screen"
          >
            <div className="preauth-navbar-row flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2 sm:px-5 sm:py-3">
              <Logo />

              <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
                <Link href="/" className="transition hover:text-foreground">
                  Platform
                </Link>
                <Link href="/lawyers" className="transition hover:text-foreground">
                  {t(language, "lawyers")}
                </Link>
                <Link href={isLogin ? "/signup" : "/login"} className="transition hover:text-foreground">
                  {isLogin ? t(language, "signup") : t(language, "login")}
                </Link>
              </nav>

              <div className="hidden min-w-0 items-center gap-2 lg:flex">
                <LanguageToggle compact />
                <ThemePresetToggle compact className="hidden max-w-[145px] xl:inline-flex" />
                <UiModeToggle compact className="rounded-full px-3" />
                <ThemeToggle className="rounded-full" />
                {!isLogin ? (
                  <Button asChild variant="ghost">
                    <Link href="/login">{t(language, "login")}</Link>
                  </Button>
                ) : null}
                <Button asChild>
                  <Link href={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-2xl lg:hidden"
                onClick={() => setOpen((current) => !current)}
                aria-label={open ? "Close navigation" : "Open navigation"}
                aria-expanded={open}
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {open ? (
              <motion.div
                key="preauth-mobile-panel"
                className="preauth-mobile-panel origin-top overflow-hidden border-t border-border/60 px-3 pb-3 pt-3 sm:px-5 lg:hidden"
                initial={{ height: 0, opacity: 0, y: -8, scaleY: 0.98 }}
                animate={{ height: "auto", opacity: 1, y: 0, scaleY: 1 }}
                exit={{ height: 0, opacity: 0, y: -6, scaleY: 0.985 }}
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <nav className="grid grid-cols-2 gap-2 text-sm font-semibold text-muted-foreground">
                  <Link href="/" className="glass-chip flex min-h-12 items-center justify-center rounded-2xl px-4 py-3">
                    Platform
                  </Link>
                  <Link href="/lawyers" className="glass-chip flex min-h-12 items-center justify-center rounded-2xl px-4 py-3">
                    {t(language, "lawyers")}
                  </Link>
                </nav>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="landing-mobile-language glass-chip flex min-h-11 items-center justify-center rounded-2xl px-2">
                    <LanguageToggle compact />
                  </div>
                  <ThemeToggle className="h-11 w-full rounded-2xl" />
                  <ThemePresetToggle compact className="h-11 w-full max-w-none rounded-2xl" />
                  <UiModeToggle compact className="h-11 rounded-2xl" />
                  <Button asChild variant="outline" className="h-11 rounded-2xl font-semibold">
                    <Link href={secondaryHref}>{secondaryLabel}</Link>
                  </Button>
                  <Button asChild className="h-11 rounded-2xl font-semibold">
                    <Link href={primaryHref}>
                      {primaryLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
              ) : null}
            </AnimatePresence>
          </GlassSurface>
        </div>
      </div>
      <div className="prelogin-navbar-spacer" aria-hidden="true" />
    </>
  );
}
