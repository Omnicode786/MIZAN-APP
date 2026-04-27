import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LawyerReviewPage() {
  const user = await getCurrentUserWithProfile();
  const lawyerProfileId = user?.lawyerProfile?.id;
  const assignments = await prisma.caseAssignment.findMany({
    where: lawyerProfileId ? { lawyerProfileId } : { id: "__NO_ACCESS__" },
    include: { case: { include: { client: { include: { user: true } } } }, lawyer: { include: { user: true } } },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/review" user={user!}>
      <SectionHeader
        eyebrow="Review Workspace"
        title="Proposal and review queue"
        description="These are the files where clients have already reached you. Open the case to review documents and send or update your proposal."
        action={
          <Button asChild variant="outline">
            <Link href="/lawyer/ai-workflows">Review AI workflows</Link>
          </Button>
        }
      />
      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="soft-hover">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{assignment.case.title}</p>
                  <p className="text-sm text-muted-foreground">Client: {assignment.case.client.user.name}</p>
                </div>
                <Badge variant={assignment.status === 'ACCEPTED' ? 'success' : assignment.status === 'DECLINED' ? 'destructive' : 'warning'}>{assignment.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{assignment.proposalNotes || 'No proposal note sent yet.'}</p>
              <div className="mt-4 flex justify-end">
                <Button asChild variant="outline"><Link href={`/lawyer/cases/${assignment.caseId}`}>Open case</Link></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!assignments.length ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No proposal requests found yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
