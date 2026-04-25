"use client";

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  CalendarClock,
  FileCheck2,
  FileText,
  FolderKanban,
  Home,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  UserCircle,
  Users
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useLanguage } from "@/hooks/use-language";
import { t, type TranslationKey } from "@/lib/translations";

type NavItem = {
  href: string;
  label: string;
  translationKey?: TranslationKey;
};

function resolveIcon(item: NavItem): LucideIcon {
  const text = `${item.href} ${item.label}`.toLowerCase();
  if (text.includes("dashboard")) return BarChart3;
  if (text.includes("assistant") || text.includes("ai ")) return Bot;
  if (text.includes("case") || text.includes("queue") || text.includes("review")) return FolderKanban;
  if (text.includes("lawyer") || text.includes("profile")) return Users;
  if (text.includes("upload") || text.includes("evidence")) return FileCheck2;
  if (text.includes("draft")) return FileText;
  if (text.includes("deadline")) return CalendarClock;
  if (text.includes("collaboration")) return MessageSquare;
  if (text.includes("analytics")) return BarChart3;
  if (text.includes("debate")) return Bot;
  if (text.includes("search")) return Search;
  if (text.includes("notification")) return Bell;
  if (text.includes("setting")) return Settings;
  if (text.includes("plan") || text.includes("pricing")) return Briefcase;
  if (text.includes("public")) return UserCircle;
  return ShieldCheck;
}

export function Sidebar({
  nav,
  heading,
  currentPath
}: {
  nav: NavItem[];
  heading: string;
  currentPath?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const language = useLanguage();

  return (
    <aside
      className={cn(
        "app-sidebar sticky top-0 hidden h-screen shrink-0 transition-all duration-300 lg:flex",
        collapsed ? "w-[92px] p-3" : "w-[304px] p-4"
      )}
    >
      <GlassSurface
        className="nav-surface h-full w-full"
        height="100%"
        borderRadius={34}
        borderWidth={0.13}
        borderGlow
        refractive
        backgroundOpacity={0.04}
        brightness={48}
        opacity={0.5}
        blur={12}
        displace={0.42}
        distortionScale={-184}
        redOffset={0}
        greenOffset={10}
        blueOffset={21}
        mixBlendMode="screen"
        saturation={1.3}
        innerClassName={cn("flex h-full min-w-0 flex-col", collapsed ? "p-3" : "p-4")}
      >
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-3")}>
          {!collapsed ? (
            <>
              <div className="overflow-hidden">
                <Logo />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setCollapsed(true)} className="shrink-0">
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="icon" onClick={() => setCollapsed(false)} className="shrink-0">
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className={cn("mt-8 flex flex-1 flex-col", collapsed && "mt-6")}>
          {!collapsed ? (
            <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {heading}
            </p>
          ) : (
            <div className="mb-3 h-3" />
          )}

          <nav className="glass-subtle space-y-2 rounded-[1.75rem] p-2 transition-colors duration-300">
            <Link
              href="/"
              title="Back to Home"
              className={cn(
                "flex rounded-2xl text-sm text-muted-foreground transition hover:bg-white/30 hover:text-foreground dark:hover:bg-white/10",
                collapsed ? "justify-center px-0 py-3" : "items-center gap-3 px-4 py-3.5"
              )}
            >
              <Home className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Back to Home</span>}
            </Link>

            {nav.map((item) => {
              const active = currentPath === item.href || currentPath?.startsWith(item.href + "/");
              const Icon = resolveIcon(item);
              const label = item.translationKey ? t(language, item.translationKey) : item.label;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex rounded-2xl text-sm transition-all duration-200",
                    collapsed ? "justify-center px-0 py-3" : "items-center gap-3 px-4 py-3.5",
                    active
                      ? "bg-primary/95 text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_14px_28px_hsl(var(--primary)/0.24)]"
                      : "text-muted-foreground hover:-translate-y-0.5 hover:bg-white/30 hover:text-foreground dark:hover:bg-white/10"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </GlassSurface>
    </aside>
  );
}
