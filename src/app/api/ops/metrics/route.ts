import { NextResponse } from "next/server";
import { forbidden, handleApiError } from "@/lib/api-response";
import { getObservabilitySnapshot, withApiObservability } from "@/lib/observability";
import { requireUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiObservability(request, { route: "/api/ops/metrics", feature: "ops.metrics" }, async () => {
    try {
      const user = await requireUser();
      if (user.role !== "ADMIN") return forbidden();

      return NextResponse.json(getObservabilitySnapshot(), {
        headers: {
          "cache-control": "no-store"
        }
      });
    } catch (error) {
      return handleApiError(error, "OPS_METRICS_ROUTE", "Unable to load operational metrics.");
    }
  });
}
