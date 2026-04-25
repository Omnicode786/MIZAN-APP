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
  user: { name: string; role: string } | null;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      <Sidebar nav={nav} heading={heading} currentPath={currentPath} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
