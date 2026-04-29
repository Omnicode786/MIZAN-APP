import { AppShell } from "@/components/workspace/app-shell";
import { LawyerRequestReviewList } from "@/components/workspace/lawyer-request-review-list";
import { SectionHeader } from "@/components/workspace/section-header";
import { Button } from "@/components/ui/button";
import { LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LawyerReviewPage() {
  const user = await getCurrentUserWithProfile();
  const lawyerProfileId = user?.lawyerProfile?.id;
  const assignments = await prisma.caseAssignment.findMany({
    where: lawyerProfileId ? { lawyerProfileId } : { id: "__NO_ACCESS__" },
    select: {
      id: true,
      caseId: true,
      lawyerProfileId: true,
      status: true,
      feeProposal: true,
      probability: true,
      proposalNotes: true,
      updatedAt: true,
      case: {
        select: {
          id: true,
          title: true,
          category: true,
          priority: true,
          description: true,
          client: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 50
  });

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/review" user={user!}>
      <SectionHeader
        eyebrow="Review Workspace"
        title="Case request queue"
        description="Clients can request only a selected lawyer. Accept a request to unlock full case details and contact information, or reject it without opening the case workspace."
        action={
          <Button asChild variant="outline">
            <a href="/lawyer/ai-workflows">Review AI workflows</a>
          </Button>
        }
      />
      <LawyerRequestReviewList assignments={assignments} />
    </AppShell>
  );
}
