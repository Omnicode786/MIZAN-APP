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
    const [activityLogs, total] = await Promise.all([
      prisma.activityLog.findMany({
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
      }),
      prisma.activityLog.count({ where })
    ]);

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
