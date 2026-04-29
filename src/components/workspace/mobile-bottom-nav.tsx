"use client";

import Link from "next/link";
import { Bot, LayoutDashboard, Plus, Search, Settings } from "lucide-react";
import { FrostedSurface } from "@/components/ui/frosted-surface";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  currentPath?: string;
  userRole?: string | null;
};

const itemClass =
  "group relative flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-0.5 py-2 text-[10px] font-black leading-none transition active:scale-95";

function isActivePath(currentPath: string | undefined, href: string) {
  return currentPath === href || Boolean(currentPath?.startsWith(`${href}/`));
}

function mobileNavItemClass(active: boolean, isLiquidGlass: boolean) {
  if (isLiquidGlass) {
    return cn(
      itemClass,
      active
        ? "bg-[linear-gradient(145deg,hsl(var(--background)/0.64),hsl(var(--destructive)/0.20)_44%,hsl(var(--primary)/0.14))] text-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.64)_inset,0_14px_30px_hsl(var(--destructive)/0.18)] ring-1 ring-destructive/24 before:pointer-events-none before:absolute before:inset-px before:rounded-[inherit] before:bg-[linear-gradient(135deg,hsl(0_0%_100%/0.46),transparent_46%)] dark:bg-[linear-gradient(145deg,hsl(var(--background)/0.78),hsl(var(--destructive)/0.34)_46%,hsl(var(--primary)/0.18))] dark:text-foreground dark:shadow-[0_1px_0_hsl(0_0%_100%/0.16)_inset,0_14px_30px_hsl(var(--destructive)/0.24)] dark:ring-destructive/34 dark:before:bg-[linear-gradient(135deg,hsl(0_0%_100%/0.14),transparent_48%)]"
        : "text-slate-950/84 hover:bg-white/52 hover:text-slate-950 dark:text-white/84 dark:hover:bg-white/12 dark:hover:text-white"
    );
  }

  return cn(
    itemClass,
    active
      ? "bg-[linear-gradient(145deg,hsl(var(--background)/0.98),hsl(var(--primary)/0.11))] text-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.8)_inset,0_10px_22px_hsl(var(--primary)/0.12)] ring-1 ring-primary/18 dark:bg-primary/12 dark:text-primary dark:shadow-[0_1px_0_hsl(0_0%_100%/0.18)_inset] dark:ring-transparent"
      : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
  );
}

function mobileNavActiveIndicatorClass(isLiquidGlass: boolean) {
  if (isLiquidGlass) {
    return "absolute top-1.5 z-10 h-1.5 w-5 rounded-full bg-[linear-gradient(90deg,hsl(var(--destructive)/0.18),hsl(var(--destructive)/0.86),hsl(var(--primary)/0.62))] shadow-[0_0_14px_hsl(var(--destructive)/0.48)] dark:bg-[linear-gradient(90deg,hsl(var(--destructive)/0.32),hsl(var(--destructive)/0.78),hsl(var(--primary)/0.52))] dark:shadow-[0_0_16px_hsl(var(--destructive)/0.36)]";
  }

  return "absolute top-1.5 z-10 h-1.5 w-5 rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)/0.18),hsl(var(--primary)/0.88),hsl(var(--primary)/0.42))] shadow-[0_0_12px_hsl(var(--primary)/0.34)] dark:bg-[linear-gradient(90deg,hsl(var(--destructive)/0.32),hsl(var(--destructive)/0.78),hsl(var(--primary)/0.52))] dark:shadow-[0_0_16px_hsl(var(--destructive)/0.36)]";
}

function mobileNavLabelClass(active: boolean, isLiquidGlass: boolean) {
  if (isLiquidGlass) {
    return cn(
      "relative z-10 whitespace-nowrap rounded-full px-1 py-0.5 text-[9px] leading-none shadow-sm ring-1 backdrop-blur-xl",
      active
        ? "bg-[linear-gradient(145deg,hsl(var(--background)/0.64),hsl(var(--destructive)/0.18))] text-foreground ring-destructive/22 dark:bg-[linear-gradient(145deg,hsl(var(--background)/0.70),hsl(var(--destructive)/0.28))] dark:text-foreground dark:ring-destructive/28"
        : "bg-white/42 text-slate-950/88 ring-white/35 group-hover:bg-white/56 dark:bg-black/28 dark:text-white/84 dark:ring-white/12 dark:group-hover:bg-white/12"
    );
  }

  return cn(
    "relative z-10 whitespace-nowrap rounded-full px-1 py-0.5 text-[9px] leading-none",
    active
      ? "bg-background/86 text-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.78)_inset,0_6px_12px_hsl(var(--primary)/0.10)] ring-1 ring-primary/14 dark:bg-primary/10 dark:text-primary dark:shadow-none dark:ring-transparent"
      : "bg-background/35 text-muted-foreground group-hover:text-foreground"
  );
}

export function MobileBottomNav({ currentPath, userRole }: MobileBottomNavProps) {
  const { uiMode } = useTheme();
  const isLiquidGlass = uiMode === "glass";
  const isLawyerWorkspace = userRole === "LAWYER" || userRole === "ADMIN";
  const dashboardHref = isLawyerWorkspace ? "/lawyer/dashboard" : "/client/dashboard";
  const lawyersHref = isLawyerWorkspace ? "/lawyers" : "/client/lawyers";
  const casesHref = isLawyerWorkspace ? "/lawyer/cases" : "/client/cases";
  const aiAssistantHref = isLawyerWorkspace ? "/lawyer/ai-workflows" : "/client/assistant";

  const leftItems = [
    { href: dashboardHref, label: "Dashboard", icon: LayoutDashboard },
    { href: lawyersHref, label: "Lawyers", icon: Search }
  ];

  const rightItems = [
    { href: aiAssistantHref, label: "AI Legal", icon: Bot },
    { href: "/settings", label: "Settings", icon: Settings }
  ];

  const caseActive = isActivePath(currentPath, casesHref);

  const navGrid = (
    <div className="grid h-[74px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_72px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1 px-2 py-2">
      {leftItems.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(currentPath, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={mobileNavItemClass(active, isLiquidGlass)}
          >
            {active ? (
              <span className={mobileNavActiveIndicatorClass(isLiquidGlass)} />
            ) : null}
            <Icon className="relative z-10 h-5 w-5" />
            <span className={mobileNavLabelClass(active, isLiquidGlass)}>{item.label}</span>
          </Link>
        );
      })}

      <div aria-hidden="true" />

      {rightItems.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(currentPath, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={mobileNavItemClass(active, isLiquidGlass)}
          >
            {active ? (
              <span className={mobileNavActiveIndicatorClass(isLiquidGlass)} />
            ) : null}
            <Icon className="relative z-10 h-5 w-5" />
            <span className={mobileNavLabelClass(active, isLiquidGlass)}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-3 pb-3 lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      aria-label="Mobile workspace navigation"
    >
      <div className="pointer-events-auto relative mx-auto max-w-md pt-8">
        {isLiquidGlass ? (
          <GlassSurface
            className="nav-surface glass-border-glow workspace-mobile-bottom-nav w-full border border-white/55 shadow-[0_20px_54px_hsl(222_18%_20%/0.22)] dark:border-white/24 dark:shadow-[0_22px_58px_hsl(0_0%_0%/0.38)]"
            width="100%"
            height="auto"
            borderRadius={30}
            borderWidth={0.18}
            backgroundOpacity={0.18}
            brightness={72}
            opacity={0.98}
            blur={16}
            displace={5.6}
            distortionScale={-285}
            redOffset={-18}
            greenOffset={28}
            blueOffset={52}
            mixBlendMode="screen"
            saturation={1.82}
          >
            {navGrid}
          </GlassSurface>
        ) : (
          <FrostedSurface
            className="workspace-mobile-bottom-nav shadow-[0_18px_48px_hsl(222_18%_20%/0.18)]"
            width="100%"
            height="auto"
            borderRadius={30}
            borderGlow
            innerClassName="h-[74px]"
          >
            {navGrid}
          </FrostedSurface>
        )}

        <Link
          href={casesHref}
          aria-label="Create or open cases"
          aria-current={caseActive ? "page" : undefined}
          className={cn(
            "group absolute left-1/2 top-0 z-20 flex -translate-x-1/2 flex-col items-center justify-center gap-1 text-[10px] font-black transition active:scale-95",
            isLiquidGlass ? "text-slate-950 dark:text-white" : "text-foreground"
          )}
        >
          <span
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full border border-white/70 bg-primary text-primary-foreground shadow-[0_20px_42px_hsl(var(--primary)/0.36),0_1px_0_hsl(0_0%_100%/0.38)_inset] transition group-hover:-translate-y-0.5",
              isLiquidGlass &&
                "border-white/80 shadow-[0_22px_46px_hsl(var(--primary)/0.34),0_0_0_1px_hsl(0_0%_100%/0.62)_inset,0_1px_0_hsl(0_0%_100%/0.55)_inset] dark:border-white/30 dark:shadow-[0_22px_46px_hsl(0_0%_0%/0.42),0_0_0_1px_hsl(0_0%_100%/0.18)_inset]",
              caseActive &&
                (isLiquidGlass
                  ? "bg-[linear-gradient(145deg,hsl(var(--background)/0.70),hsl(var(--destructive)/0.26)_46%,hsl(var(--primary)/0.22))] text-foreground ring-4 ring-destructive/20 dark:bg-[linear-gradient(145deg,hsl(var(--background)/0.84),hsl(var(--destructive)/0.42)_48%,hsl(var(--primary)/0.26))] dark:text-foreground dark:ring-destructive/24"
                  : "ring-4 ring-primary/18")
            )}
          >
            <Plus className="h-7 w-7" />
          </span>
          <span className={mobileNavLabelClass(caseActive, isLiquidGlass)}>Cases</span>
        </Link>
      </div>
    </nav>
  );
}
