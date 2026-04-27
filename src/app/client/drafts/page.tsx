import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CLIENT_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientDraftsPage() {
  const user = await getCurrentUserWithProfile();
  const clientProfileId = user?.clientProfile?.id;
  const drafts = await prisma.draft.findMany({
    where: clientProfileId ? { case: { clientProfileId } } : { id: "__NO_ACCESS__" },
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
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/drafts" user={user!}>
      <SectionHeader
        eyebrow="Drafting Studio"
        title="All drafts across your matters"
        description="Open a case workspace to generate, revise, and send drafts for lawyer review."
        action={<Button asChild><Link href="/client/cases">Open case workspace</Link></Button>}
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
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>{draft._count.versions} versions</span>
                <Button asChild variant="outline"><Link href={`/client/cases/${draft.caseId}`}>Open case</Link></Button>
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
