import { NextResponse } from "next/server";
import { handleApiError, notFound } from "@/lib/api-response";
import { getPagination } from "@/lib/pagination";
import { buildAccessibleCaseWhereForUser, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPagination(searchParams, { limit: 30, maxLimit: 100 });

    const accessibleCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, params.id),
      select: { id: true, _count: { select: { timelineEvents: true } } }
    });
    if (!accessibleCase) return notFound();

    const where = { caseId: params.id };
    const timelineEvents = await prisma.timelineEvent.findMany({
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
    });
    const total = accessibleCase._count.timelineEvents;

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
