import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api-response";
import { getAgentActionReviewsForUser } from "@/lib/agent-action-reviews";
import { recordQueueMetric, withApiObservability } from "@/lib/observability";
import { requireUser } from "@/lib/permissions";

const querySchema = z.object({
  caseId: z.string().optional(),
  status: z.string().optional()
});

export async function GET(request: Request) {
  return withApiObservability(request, { route: "/api/ai/actions", feature: "ai.actions" }, async () => {
    try {
      const user = await requireUser();
      const url = new URL(request.url);
      const query = querySchema.parse({
        caseId: url.searchParams.get("caseId") || undefined,
        status: url.searchParams.get("status") || undefined
      });

      const reviews = await getAgentActionReviewsForUser({
        user,
        caseId: query.caseId,
        status: query.status
      });

      recordQueueMetric("list", "OK", {
        userId: user.id,
        count: reviews.length,
        status: query.status || "ALL"
      });

      return NextResponse.json({ reviews });
    } catch (error) {
      return handleApiError(error, "AI_ACTIONS_LIST_ROUTE", "Unable to load assistant actions.");
    }
  });
}
