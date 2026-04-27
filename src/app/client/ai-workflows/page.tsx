import { notFound } from "next/navigation";
import { AgentActionQueuePanel, type AgentWorkflowReviewItem } from "@/components/workspace/agent-action-queue-panel";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { CLIENT_NAV } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientAiWorkflowsPage() {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "CLIENT" || !user.clientProfile) notFound();

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
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/ai-workflows" user={user}>
      <SectionHeader
        eyebrow="AI Workflows"
        title="Review assistant actions before they change your workspace"
        description="Case creation, deadlines, drafts, roadmap entries, evidence intake, and handoff actions appear here for approval before MIZAN saves them."
      />
      <AgentActionQueuePanel
        initialReviews={reviews.map(toWorkflowReview)}
        assistantHref="/client/assistant"
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
