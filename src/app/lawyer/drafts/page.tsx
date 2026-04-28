import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LawyerDraftsPage() {
  const user = await getCurrentUserWithProfile();
  const lawyerProfileId = user?.lawyerProfile?.id;
  const drafts = await prisma.draft.findMany({
    where: lawyerProfileId
      ? { case: { assignments: { some: { lawyerProfileId } } } }
      : { id: "__NO_ACCESS__" },
    select: {
      id: true,
      caseId: true,
      title: true,
      type: true,
      currentContent: true,
      verificationStatus: true,
      updatedAt: true,
      case: {
        select: {
          id: true,
          title: true
        }
      },
      _count: {
        select: {
          versions: true
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 50
  });

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/drafts" user={user!}>
      <SectionHeader
        eyebrow="Draft approvals"
        title="Review and verify live drafts"
        description="Use the case workspace to edit the text, mark it verified, or return it for correction."
      />
      <div className="grid gap-4">
        {drafts.map((draft) => (
          <Card key={draft.id} className="soft-hover">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{draft.title}</p>
                  <p className="text-sm text-muted-foreground">{draft.case.title}</p>
                </div>
                <Badge variant={draft.verificationStatus === 'VERIFIED' ? 'success' : draft.verificationStatus === 'NEEDS_CORRECTION' ? 'destructive' : 'warning'}>{draft.verificationStatus}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{draft.currentContent.slice(0, 280)}{draft.currentContent.length > 280 ? '...' : ''}</p>
              <div className="mt-4 flex justify-end">
                <Button asChild variant="outline"><Link href={`/lawyer/cases/${draft.caseId}`}>Open case</Link></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!drafts.length ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No drafts found yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
