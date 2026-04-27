import type { Prisma } from "@prisma/client";
import {
  extractAssistantActionMeta,
  extractAssistantAgentProposalMeta,
  extractAssistantCasePreviewMeta,
  type AssistantAgentProposalMeta
} from "@/lib/assistant-message-meta";
import { executeAgentMutationProposal, type AgentRunnerResult } from "@/lib/ai/agent-runner";
import { normalizeLanguage, type AppLanguage } from "@/lib/language";
import { buildAccessibleCaseWhereForUser, type AppUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function proposalFromContent(content: string): AssistantAgentProposalMeta | null {
  const existing = extractAssistantAgentProposalMeta(content);
  if (existing) return existing;

  const casePreview = extractAssistantCasePreviewMeta(content);
  if (!casePreview) return null;

  return {
    tool: "create_case",
    status: "pending_confirmation",
    arguments: casePreview.arguments,
    title:
      casePreview.title ||
      stringValue(casePreview.arguments.title) ||
      stringValue(casePreview.arguments.summary) ||
      "Create case",
    message: "Create this case in your workspace/database.",
    createdAt: casePreview.createdAt
  };
}

export async function createAgentActionReviewFromAssistantMessage(input: {
  userId: string;
  caseId?: string;
  documentId?: string;
  assistantThreadId: string;
  assistantMessageId: string;
  content: string;
}) {
  const completedAction = extractAssistantActionMeta(input.content);
  if (completedAction?.tool) return null;

  const proposal = proposalFromContent(input.content);
  if (!proposal) return null;

  return prisma.agentActionReview.create({
    data: {
      createdById: input.userId,
      caseId: input.caseId,
      documentId: input.documentId,
      assistantThreadId: input.assistantThreadId,
      assistantMessageId: input.assistantMessageId,
      tool: proposal.tool,
      title: proposal.title || "Assistant action",
      message: proposal.message,
      status: "PENDING",
      arguments: proposal.arguments as Prisma.InputJsonValue
    }
  });
}

export async function getAgentActionReviewsForUser(input: {
  user: AppUser;
  caseId?: string;
  status?: string;
}) {
  return prisma.agentActionReview.findMany({
    where: {
      createdById: input.user.id,
      caseId: input.caseId,
      status: input.status
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50
  });
}

export async function getScopedAgentActionReview(user: AppUser, id: string) {
  const review = await prisma.agentActionReview.findFirst({
    where: {
      id,
      createdById: user.id
    }
  });

  if (!review) {
    throw new Error("Not found");
  }

  if (review.caseId) {
    const legalCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, review.caseId),
      select: { id: true }
    });
    if (!legalCase) {
      throw new Error("Forbidden");
    }
  }

  return review;
}

export async function rejectAgentActionReview(input: {
  user: AppUser;
  id: string;
}) {
  const review = await getScopedAgentActionReview(input.user, input.id);
  if (review.status !== "PENDING") return review;

  await prisma.agentActionReview.updateMany({
    where: {
      id: review.id,
      createdById: input.user.id,
      status: "PENDING"
    },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      resultMessage: "The proposed AI action was rejected. Nothing was changed."
    }
  });

  return prisma.agentActionReview.findUniqueOrThrow({
    where: { id: review.id }
  });
}

export async function approveAgentActionReview(input: {
  user: AppUser;
  id: string;
  language?: AppLanguage | string;
  question?: string;
  argumentsOverride?: Record<string, unknown>;
}): Promise<{ review: any; result: AgentRunnerResult }> {
  const review = await getScopedAgentActionReview(input.user, input.id);
  if (review.status !== "PENDING") {
    throw new Error("This action has already been reviewed.");
  }

  const claimed = await prisma.agentActionReview.updateMany({
    where: {
      id: review.id,
      createdById: input.user.id,
      status: "PENDING"
    },
    data: {
      status: "PROCESSING",
      reviewedAt: new Date()
    }
  });

  if (claimed.count !== 1) {
    throw new Error("This action has already been reviewed.");
  }

  const proposal: AssistantAgentProposalMeta = {
    tool: review.tool,
    status: "pending_confirmation",
    title: review.title,
    message: review.message || "Apply this assistant action.",
    arguments:
      input.argumentsOverride && typeof input.argumentsOverride === "object"
        ? input.argumentsOverride
        : ((review.arguments || {}) as Record<string, unknown>),
    createdAt: review.createdAt.toISOString()
  };

  let result: AgentRunnerResult;

  try {
    result = await executeAgentMutationProposal({
      currentUser: input.user,
      proposal,
      question: input.question || `Approve queued action: ${review.title}`,
      caseId: review.caseId || undefined,
      documentId: review.documentId || undefined,
      language: normalizeLanguage(input.language)
    });
  } catch (error) {
    await prisma.agentActionReview.update({
      where: { id: review.id },
      data: {
        status: "FAILED",
        resultMessage: "I could not complete that action. Please try again or create it manually."
      }
    });
    throw error;
  }

  const action = extractAssistantActionMeta(result.text);
  const failed = action?.status === "error";

  const updated = await prisma.agentActionReview.update({
    where: { id: review.id },
    data: {
      status: failed ? "FAILED" : "COMPLETED",
      arguments: proposal.arguments as Prisma.InputJsonValue,
      reviewedAt: new Date(),
      resultMessage: action?.message || result.text,
      resultAction: (action as Prisma.InputJsonValue | null) || undefined
    }
  });

  return { review: updated, result };
}
