import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleApiError, notFound, unauthorized, validationError } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { assertAiUsageAvailable } from "@/lib/ai-usage";
import { answerPakistaniLegalQuestion, generateAssistantThreadTitle } from "@/lib/legal-ai";
import { runAgentTurn } from "@/lib/ai/agent-runner";
import { createAgentActionReviewFromAssistantMessage } from "@/lib/agent-action-reviews";
import { normalizeLanguage } from "@/lib/language";
import { withApiObservability } from "@/lib/observability";
import { getAccessibleCase } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  threadId: z.string().optional(),
  caseId: z.string().optional(),
  documentId: z.string().optional(),
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
    let caseTitle: string | undefined;

    if (body.caseId) {
      const { legalCase } = await getAccessibleCase(body.caseId);
      if (!legalCase) return notFound();
      caseTitle = legalCase.title;
    }

    let threadId = body.threadId;
    let recentMessages: { role: string; content: string | null }[] = [];

    if (threadId) {
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
        orderBy: { createdAt: "desc" },
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

    if (!threadId) {
      let threadTitle = body.title?.trim() || "New conversation";

      try {
        threadTitle = await generateAssistantThreadTitle({
          question: body.question,
          caseTitle,
          language
        });
      } catch (error) {
        console.error("[AI_CHAT_TITLE_ERROR]", error);
      }

      const thread = await prisma.assistantThread.create({
        data: {
          createdById: user.id,
          caseId: body.caseId,
          documentId: body.documentId,
          title: threadTitle,
          scope: body.documentId ? "DOCUMENT" : body.caseId ? "CASE" : "GENERAL"
        }
      });
      threadId = thread.id;
    }

    if (!threadId) return apiError("Unable to start this conversation right now.", 500);

    const [, message] = await prisma.$transaction([
      prisma.assistantMessage.create({
        data: {
          threadId,
          role: "USER",
          content: body.question
        }
      }),
      prisma.assistantMessage.create({
        data: {
          threadId,
          role: "AI",
          content: ai.text,
          confidence: ai.confidence,
          sources: ai.sources
        }
      }),
      prisma.assistantThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() }
      })
    ]);

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

    const thread = await prisma.assistantThread.findUnique({
      where: { id: threadId },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });

    return NextResponse.json({ thread, message });
    } catch (error) {
      return handleApiError(error, "AI_CHAT_ROUTE", "Unable to process this request right now.");
    }
  });
}
