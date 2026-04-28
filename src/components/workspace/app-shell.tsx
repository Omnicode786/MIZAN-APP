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
    <div className="workspace-shell relative flex h-dvh overflow-hidden bg-background transition-colors duration-300">
      <Sidebar nav={nav} heading={heading} currentPath={currentPath} />
      <div className="relative flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50">
          <div className="pointer-events-auto">
            <Topbar user={user} nav={nav} currentPath={currentPath} />
          </div>
        </div>
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-3 pb-5 pt-24 sm:px-5 sm:pt-28 lg:px-6 xl:px-8 xl:pb-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
