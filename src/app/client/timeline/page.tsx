import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { TimelineView } from "@/components/workspace/timeline-view";
import { Button } from "@/components/ui/button";
import { CLIENT_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientTimelinePage() {
  const user = await getCurrentUserWithProfile();
  const clientProfileId = user?.clientProfile?.id;
  const items = await prisma.timelineEvent.findMany({
    where: clientProfileId ? { case: { clientProfileId } } : { id: "__NO_ACCESS__" },
    orderBy: { eventDate: 'asc' }
  });

  return (
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/timeline" user={user!}>
      <SectionHeader
        eyebrow="Timeline"
        title="Key evidence dates and mapped next steps"
        description="Every upload can add real events and recommended actions to the case timeline."
        action={<Button asChild variant="outline"><Link href="/client/cases">Open case workspace</Link></Button>}
      />
      <TimelineView items={items} />
    </AppShell>
  );
}
