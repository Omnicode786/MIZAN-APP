import { AppShell } from "@/components/workspace/app-shell";
import { DeadlineBoard } from "@/components/workspace/deadline-board";
import { SectionHeader } from "@/components/workspace/section-header";
import { LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LawyerDeadlinesPage() {
  const user = await getCurrentUserWithProfile();
  const deadlines = await prisma.deadline.findMany({
    where: { case: { assignments: { some: { lawyerProfileId: user?.lawyerProfile?.id } } } },
    orderBy: { dueDate: "asc" }
  });

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/deadlines" user={user!}>
      <SectionHeader
        eyebrow="Deadline Cockpit"
        title="Deadlines across active matters"
        description="All assigned-case deadlines in one board. Open a case to update them or add new manual actions."
        action={<div />}
      />
      <DeadlineBoard deadlines={deadlines} />
    </AppShell>
  );
}
