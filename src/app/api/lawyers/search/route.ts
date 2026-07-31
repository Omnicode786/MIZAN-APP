import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, unauthorized } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { searchLawyersForCase } from "@/lib/lawyer-search";
import { withApiObservability } from "@/lib/observability";

const schema = z.object({
  caseSummary: z.string().optional(),
  practiceArea: z.string().optional(),
  caseCategory: z.string().optional(),
  jurisdiction: z.string().optional(),
  city: z.string().optional(),
  preferredLanguage: z.string().optional(),
  budget: z
    .object({
      minimum: z.number().min(0).optional(),
      maximum: z.number().min(0).optional()
    })
    .optional(),
  consultationType: z.string().optional(),
  limit: z.number().int().min(1).max(12).optional()
});

export async function POST(request: Request) {
  return withApiObservability(request, { route: "/api/lawyers/search", feature: "lawyer.discovery" }, async () => {
    try {
      const user = await getCurrentUserWithProfile();
      if (!user) return unauthorized();
      if (user.role !== "CLIENT" && user.role !== "ADMIN") return forbidden();

      const body = schema.parse(await request.json());
      const result = await searchLawyersForCase(body);

      return NextResponse.json(result);
    } catch (error) {
      return handleApiError(error, "LAWYER_SEARCH_ROUTE", "Unable to search lawyers.");
    }
  });
}
