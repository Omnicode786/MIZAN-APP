import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { DeadlineBoard } from "@/components/workspace/deadline-board";
import { SectionHeader } from "@/components/workspace/section-header";
import { Button } from "@/components/ui/button";
import { CLIENT_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientDeadlinesPage() {
  const user = await getCurrentUserWithProfile();
  const deadlines = await prisma.deadline.findMany({
    where: { case: { clientProfileId: user?.clientProfile?.id } },
    orderBy: { dueDate: "asc" }
  });

  return (
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/deadlines" user={user!}>
      <SectionHeader
        eyebrow="Deadlines"
        title="Track limitation and action dates"
        description="AI-detected and manual deadlines live here, but they are managed from inside each case workspace."
        action={<Button asChild><Link href="/client/cases">Open case workspace</Link></Button>}
      />
      <DeadlineBoard deadlines={deadlines} />
    </AppShell>
  );
}
