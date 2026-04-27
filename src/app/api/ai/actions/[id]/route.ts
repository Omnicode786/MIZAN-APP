import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, validationError } from "@/lib/api-response";
import {
  approveAgentActionReview,
  rejectAgentActionReview
} from "@/lib/agent-action-reviews";
import { stripAssistantActionMeta } from "@/lib/assistant-message-meta";
import { normalizeLanguage } from "@/lib/language";
import { recordQueueMetric, withApiObservability } from "@/lib/observability";
import { logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  language: z.enum(["en", "ur", "roman-ur"]).optional(),
  arguments: z.record(z.unknown()).optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withApiObservability(request, { route: "/api/ai/actions/[id]", feature: "ai.actions" }, async () => {
    try {
      const user = await requireUser();
      const body = schema.parse(await request.json());

      if (body.decision === "REJECT") {
        const review = await rejectAgentActionReview({ user, id: params.id });

      if (review.assistantThreadId) {
        await prisma.assistantMessage.createMany({
          data: [
            {
              threadId: review.assistantThreadId,
              role: "USER",
              content: `Rejected queued action: ${review.title}`
            },
            {
              threadId: review.assistantThreadId,
              role: "AI",
              content: "No action was saved. I kept this as a discussion only.",
              confidence: 0.9,
              sources: ["AI action review queue"]
            }
          ]
        });
      }

      if (review.caseId) {
        await logActivity(review.caseId, user.id, "AI_ACTION_REJECTED", `Rejected AI action: ${review.title}.`);
      }

        recordQueueMetric(review.tool, "REJECTED", { userId: user.id, reviewId: review.id });
        return NextResponse.json({ review });
      }

      if (body.decision !== "APPROVE") return validationError("Invalid decision.");

      const { review, result } = await approveAgentActionReview({
        user,
        id: params.id,
        language: normalizeLanguage(body.language),
        question: "Approve this queued AI action.",
        argumentsOverride: body.arguments
      });

    if (review.assistantThreadId) {
      await prisma.assistantMessage.createMany({
        data: [
          {
            threadId: review.assistantThreadId,
            role: "USER",
            content: `Approved queued action: ${review.title}`
          },
          {
            threadId: review.assistantThreadId,
            role: "AI",
            content: result.text,
            confidence: result.confidence,
            sources: result.sources
          }
        ]
      });

      await prisma.assistantThread.update({
        where: { id: review.assistantThreadId },
        data: { updatedAt: new Date() }
      });
    }

    if (review.caseId) {
      await logActivity(
        review.caseId,
        user.id,
        review.status === "COMPLETED" ? "AI_ACTION_APPROVED" : "AI_ACTION_FAILED",
        `${review.status === "COMPLETED" ? "Approved" : "Failed"} AI action: ${review.title}.`
      );
    }

      recordQueueMetric(review.tool, review.status, { userId: user.id, reviewId: review.id });
      return NextResponse.json({
        review,
        result: {
          ...result,
          displayText: stripAssistantActionMeta(result.text)
        }
      });
    } catch (error) {
      return handleApiError(error, "AI_ACTION_REVIEW_ROUTE", "This assistant action could not be completed.");
    }
  });
}
