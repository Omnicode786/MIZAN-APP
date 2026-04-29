import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LawyerAnalyticsPage() {
  const user = await getCurrentUserWithProfile();
  const lawyerProfileId = user?.lawyerProfile?.id;
  const where = lawyerProfileId ? { lawyerProfileId } : { id: "__NO_ACCESS__" };
  const [accepted, pending, probabilityAggregate] = await Promise.all([
    prisma.caseAssignment.count({ where: { ...where, status: "ACCEPTED" } }),
    prisma.caseAssignment.count({ where: { ...where, status: "PENDING" } }),
    prisma.caseAssignment.aggregate({
      where: { ...where, status: "ACCEPTED" },
      _avg: { probability: true }
    })
  ]);
  const avgProbability = Math.round((probabilityAggregate._avg.probability || 0) * 100);

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/analytics" user={user!}>
      <SectionHeader
        eyebrow="Analytics"
        title="Matter pipeline overview"
        description="A compact read on pending requests, accepted matters, and confidence for cases you have explicitly accepted."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Pending requests', pending],
          ['Accepted cases', accepted],
          ['Average confidence', `${avgProbability}%`]
        ].map(([label, value]) => (
          <Card key={label} className="soft-hover"><CardContent className="p-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-4xl font-semibold">{value}</p></CardContent></Card>
        ))}
      </div>
    </AppShell>
  );
}
