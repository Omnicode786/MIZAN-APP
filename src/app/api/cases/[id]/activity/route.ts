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
      select: { id: true, _count: { select: { activityLogs: true } } }
    });
    if (!accessibleCase) return notFound();

    const where = { caseId: params.id };
    const activityLogs = await prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        caseId: true,
        actorId: true,
        action: true,
        detail: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });
    const total = accessibleCase._count.activityLogs;

    return NextResponse.json({
      activityLogs,
      page,
      limit,
      total,
      hasMore: skip + activityLogs.length < total
    });
  } catch (error) {
    return handleApiError(error, "CASE_ACTIVITY_ROUTE", "Unable to load case activity.");
  }
}
