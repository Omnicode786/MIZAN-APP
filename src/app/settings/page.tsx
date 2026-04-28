import { redirect } from "next/navigation";
import Link from "next/link";
import { AppearanceSettingsPanel } from "@/components/workspace/appearance-settings-panel";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { CLIENT_NAV, LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await getCurrentUserWithProfile();

  if (!user) {
    redirect("/login");
  }

  const nav = user.role === "LAWYER" || user.role === "ADMIN" ? LAWYER_NAV : CLIENT_NAV;
  const dashboardHref = user.role === "LAWYER" || user.role === "ADMIN" ? "/lawyer/dashboard" : "/client/dashboard";

  return (
    <AppShell nav={nav} heading="Settings" currentPath="/settings" user={user}>
      <SectionHeader
        eyebrow="Settings"
        title="Workspace preferences"
        description="Manage your Mizan appearance controls from one focused place instead of crowding the workspace navbar."
        action={
          <Link
            href={dashboardHref}
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Back to workspace
          </Link>
        }
      />

      <AppearanceSettingsPanel />
    </AppShell>
  );
}
