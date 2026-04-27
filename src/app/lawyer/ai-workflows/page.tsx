import { notFound } from "next/navigation";
import { AgentActionQueuePanel, type AgentWorkflowReviewItem } from "@/components/workspace/agent-action-queue-panel";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { LAWYER_NAV } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LawyerAiWorkflowsPage() {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "LAWYER" || !user.lawyerProfile) notFound();

  const reviews = await prisma.agentActionReview.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      tool: true,
      title: true,
      message: true,
      status: true,
      arguments: true,
      resultMessage: true,
      resultAction: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true,
      caseId: true,
      documentId: true,
      case: {
        select: {
          id: true,
          title: true,
          category: true,
          status: true
        }
      },
      document: {
        select: {
          id: true,
          fileName: true,
          mimeType: true
        }
      }
    }
  });

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/ai-workflows" user={user}>
      <SectionHeader
        eyebrow="AI Workflows"
        title="Approve assistant work before it is saved"
        description="Review lawyer-side notes, deadlines, drafts, strategies, bundles, and case analysis proposals before they change your workspace."
      />
      <AgentActionQueuePanel
        initialReviews={reviews.map(toWorkflowReview)}
        assistantHref="/lawyer/review"
      />
    </AppShell>
  );
}

function toWorkflowReview(review: any): AgentWorkflowReviewItem {
  return {
    id: review.id,
    tool: review.tool,
    title: review.title,
    message: review.message,
    status: review.status,
    arguments: review.arguments,
    resultMessage: review.resultMessage,
    resultAction: review.resultAction,
    reviewedAt: review.reviewedAt?.toISOString() || null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    caseId: review.caseId,
    documentId: review.documentId,
    legalCase: review.case,
    document: review.document
  };
}
