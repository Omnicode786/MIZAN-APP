import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LawyerAnalyticsPage() {
  const user = await getCurrentUserWithProfile();
  const lawyerProfileId = user?.lawyerProfile?.id;
  const assignments = await prisma.caseAssignment.findMany({
    where: lawyerProfileId ? { lawyerProfileId } : { id: "__NO_ACCESS__" }
  });
  const accepted = assignments.filter((item) => item.status === 'ACCEPTED').length;
  const pending = assignments.filter((item) => item.status === 'PENDING').length;
  const avgProbability = assignments.length ? Math.round((assignments.reduce((sum, item) => sum + (item.probability || 0), 0) / assignments.length) * 100) : 0;

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/analytics" user={user!}>
      <SectionHeader
        eyebrow="Analytics"
        title="Matter pipeline overview"
        description="A compact read on how many files you are reviewing, how many proposals are pending, and how strong your current matters look."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Active requests', pending],
          ['Approved proposals', accepted],
          ['Average confidence', `${avgProbability}%`]
        ].map(([label, value]) => (
          <Card key={label} className="soft-hover"><CardContent className="p-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-4xl font-semibold">{value}</p></CardContent></Card>
        ))}
      </div>
    </AppShell>
  );
}
