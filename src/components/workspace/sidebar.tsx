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
        "app-sidebar sticky top-0 hidden h-screen shrink-0 border-r border-border/70 bg-card/75 backdrop-blur-2xl transition-all duration-300 lg:flex lg:flex-col dark:bg-card/82",
        collapsed ? "w-[84px] px-3 py-5" : "w-72 p-5"
      )}
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

        <nav className="space-y-2 rounded-[1.75rem] border border-border/60 bg-background/55 p-2 shadow-[0_12px_34px_rgba(15,23,42,0.06)] transition-colors duration-300 dark:bg-background/80 dark:shadow-[0_22px_44px_rgba(0,0,0,0.22)]">
          <Link
            href="/"
            title="Back to Home"
            className={cn(
              "flex rounded-2xl text-sm text-muted-foreground transition hover:bg-muted/80 hover:text-foreground",
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
                    ? "bg-primary text-primary-foreground shadow-[0_14px_28px_hsl(var(--primary)/0.24)]"
                    : "text-muted-foreground hover:-translate-y-0.5 hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
