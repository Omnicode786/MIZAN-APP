import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { CLIENT_NAV, LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { getNotifications } from "@/lib/data-access";
import { formatDate } from "@/lib/utils";

export default async function NotificationsPage() {
  const user = await getCurrentUserWithProfile();
  const notifications = await getNotifications();
  const nav = user?.role === 'LAWYER' ? LAWYER_NAV : CLIENT_NAV;
  const heading = user?.role === 'LAWYER' ? 'Lawyer Workspace' : 'Client Workspace';

  return (
    <AppShell nav={nav} heading={heading} currentPath="/notifications" user={user!}>
      <SectionHeader eyebrow="Notifications" title="Recent workflow updates" description="Requests, proposals, deadlines, and activity updates appear here as the live case record changes." action={<div />} />
      <div className="grid gap-4">
        {notifications.map((item: any) => (
          <Card key={item.id}><CardContent className="p-5"><p className="font-medium">{item.title}</p><p className="mt-2 text-sm text-muted-foreground">{item.body}</p><p className="mt-3 text-xs text-muted-foreground">{formatDate(item.createdAt, 'dd MMM yyyy, p')}</p></CardContent></Card>
        ))}
      </div>
    </AppShell>
  );
}
