import { ReactNode } from "react";
import { Sidebar } from "@/components/workspace/sidebar";
import { Topbar } from "@/components/workspace/topbar";
import type { TranslationKey } from "@/lib/translations";

export function AppShell({
  nav,
  heading,
  currentPath,
  user,
  children
}: {
  nav: Array<{ href: string; label: string; translationKey?: TranslationKey }>;
  heading: string;
  currentPath?: string;
  user: { name: string; role: string };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar nav={nav} heading={heading} currentPath={currentPath} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
