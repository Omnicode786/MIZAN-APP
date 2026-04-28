import { NextResponse } from "next/server";
import { handleApiError, notFound } from "@/lib/api-response";
import { getPagination } from "@/lib/pagination";
import { canAccessCase, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (!(await canAccessCase(user, params.id))) return notFound();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPagination(searchParams, { limit: 30, maxLimit: 100 });

    const where = { caseId: params.id };
    const [timelineEvents, total] = await Promise.all([
      prisma.timelineEvent.findMany({
        where,
        select: {
          id: true,
          caseId: true,
          sourceDocumentId: true,
          title: true,
          description: true,
          eventDate: true,
          confidence: true,
          sourceLabel: true,
          isAiGenerated: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
        skip,
        take: limit
      }),
      prisma.timelineEvent.count({ where })
    ]);

    return NextResponse.json({
      timelineEvents,
      page,
      limit,
      total,
      hasMore: skip + timelineEvents.length < total
    });
  } catch (error) {
    return handleApiError(error, "CASE_TIMELINE_ROUTE", "Unable to load case timeline.");
  }
}
