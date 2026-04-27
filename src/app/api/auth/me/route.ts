import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { withApiObservability } from "@/lib/observability";

export async function GET(request: Request) {
  return withApiObservability(request, { route: "/api/auth/me", feature: "auth" }, async () => {
    try {
      const user = await getCurrentUserWithProfile();
      return NextResponse.json({ user }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      return handleApiError(error, "AUTH_ME_ROUTE", "Unable to load account.");
    }
  });
}
