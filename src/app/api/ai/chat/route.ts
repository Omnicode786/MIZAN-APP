import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleApiError, notFound, unauthorized, validationError } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { assertAiUsageAvailable } from "@/lib/ai-usage";
import { answerPakistaniLegalQuestion } from "@/lib/legal-ai";
import { runAgentTurn } from "@/lib/ai/agent-runner";
import { createAgentActionReviewFromAssistantMessage } from "@/lib/agent-action-reviews";
import {
  appendAssistantMessages,
  assistantMessageAscendingOrder,
  assistantMessageDescendingOrder
} from "@/lib/assistant-message-order";
import { normalizeLanguage } from "@/lib/language";
import { withApiObservability } from "@/lib/observability";
import { getAccessibleCase } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const optionalRequestId = z.string().min(1).nullish().transform((value) => value ?? undefined);

const schema = z.object({
  threadId: optionalRequestId,
  caseId: optionalRequestId,
  documentId: optionalRequestId,
  question: z.string().min(2),
  title: z.string().optional(),
  language: z.enum(["en", "ur", "roman-ur"]).optional(),
  agentMode: z.boolean().optional()
});

const AGENT_INTENT_PATTERN =
  /\b(create|open|start|make|file|save|add|update|change|generate|prepare|build|summarize|explain|find|list|analyze|classify|review|check|score|rate|request|book|schedule|propose)\b[\s\S]{0,90}\b(case|matter|database|workspace|deadline|timeline|event|draft|notice|template|roadmap|handoff|packet|bundle|court|annexure|consultation|meeting|hearing|evidence|document|gap|checklist|health|lawyer|note|it|this)\b/i;

export async function POST(request: Request) {
  return withApiObservability(request, { route: "/api/ai/chat", feature: "ai.chat" }, async () => {
    try {
    const user = await getCurrentUserWithProfile();
    if (!user) return unauthorized();

    const body = schema.parse(await request.json());
    await assertAiUsageAvailable(user.id);
    const language = normalizeLanguage(body.language);

    if (body.caseId) {
      const { legalCase } = await getAccessibleCase(body.caseId);
      if (!legalCase) return notFound();
    }

    let threadId = body.threadId;
    let createdThreadForRequest = false;
    let recentMessages: { role: string; content: string | null }[] = [];

    if (!threadId) {
      const provisionalTitle = body.title?.trim() || body.question.slice(0, 80).trim() || "New conversation";
      const thread = await prisma.assistantThread.create({
        data: {
          createdById: user.id,
          caseId: body.caseId,
          documentId: body.documentId,
          title: provisionalTitle,
          scope: body.documentId ? "DOCUMENT" : body.caseId ? "CASE" : "GENERAL"
        }
      });

      threadId = thread.id;
      createdThreadForRequest = true;
    }

    if (!threadId) return apiError("Unable to start this conversation right now.", 500);

    if (!createdThreadForRequest) {
      const existingThread = await prisma.assistantThread.findFirst({
        where: { id: threadId, createdById: user.id }
      });

      if (!existingThread) return notFound();

      if (
        (existingThread.caseId || null) !== (body.caseId || null) ||
        (existingThread.documentId || null) !== (body.documentId || null)
      ) {
        return validationError("This conversation belongs to a different assistant context.");
      }

      const latestMessages = await prisma.assistantMessage.findMany({
        where: { threadId },
        orderBy: assistantMessageDescendingOrder,
        take: 12,
        select: {
          role: true,
          content: true
        }
      });

      recentMessages = latestMessages.reverse().map((message) => ({
        role: message.role,
        content: message.content
      }));
    }

    const hasPendingAgentProposal = recentMessages.some(
      (message) =>
        message.role === "AI" &&
        ((message.content || "").includes("MIZAN_CASE_PREVIEW") ||
          (message.content || "").includes("MIZAN_AGENT_PROPOSAL"))
    );
    const shouldRunAgent =
      Boolean(body.agentMode) ||
      hasPendingAgentProposal ||
      AGENT_INTENT_PATTERN.test(body.question);

    const ai = shouldRunAgent
      ? await runAgentTurn({
          currentUser: user,
          question: body.question,
          caseId: body.caseId,
          documentId: body.documentId,
          simpleLanguageMode: user.clientProfile?.simpleLanguageMode,
          language,
          recentMessages
        })
      : await answerPakistaniLegalQuestion({
          question: body.question,
          caseId: body.caseId,
          documentId: body.documentId,
          role: user.role,
          simpleLanguageMode: user.clientProfile?.simpleLanguageMode,
          language,
          recentMessages,
        userId: user.id
        });

    const createdMessages = await prisma.$transaction(async (tx) => {
      const createdMessages = await appendAssistantMessages(tx, threadId, [
        {
          role: "USER",
          content: body.question
        },
        {
          role: "AI",
          content: ai.text,
          confidence: ai.confidence,
          sources: ai.sources
        }
      ]);

      await tx.assistantThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() }
      });

      return createdMessages;
    });
    const message = createdMessages[1];

    if (!message) {
      return apiError("The assistant answered, but the message could not be saved.", 500);
    }

    try {
      await createAgentActionReviewFromAssistantMessage({
        userId: user.id,
        caseId: body.caseId,
        documentId: body.documentId,
        assistantThreadId: threadId,
        assistantMessageId: message.id,
        content: ai.text
      });
    } catch (error) {
      console.error("[AI_ACTION_REVIEW_CREATE_ERROR]", error);
    }

    const thread =
      (await prisma.assistantThread.findUnique({
      where: { id: threadId },
      include: { messages: { orderBy: assistantMessageAscendingOrder } }
      })) ||
      ({
        id: threadId,
        title: body.title?.trim() || body.question.slice(0, 80).trim() || "New conversation",
        caseId: body.caseId || null,
        documentId: body.documentId || null,
        scope: body.documentId ? "DOCUMENT" : body.caseId ? "CASE" : "GENERAL",
        messages: createdMessages
      } as const);

    return NextResponse.json({ thread, message });
    } catch (error) {
      return handleApiError(error, "AI_CHAT_ROUTE", "Unable to process this request right now.");
    }
  });
}
