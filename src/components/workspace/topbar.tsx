"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";

export function Topbar({
  user
}: {
  user: { name: string; role: string };
}) {
  const language = useLanguage();

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/70 bg-background/80 px-6 py-4 backdrop-blur">
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder={t(language, "searchPlaceholder")}
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <LanguageToggle compact />
        <Button variant="outline" size="icon" asChild>
          <Link href="/notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 px-3 py-2">
          <Avatar name={user.name} className="h-9 w-9 text-xs" />
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
