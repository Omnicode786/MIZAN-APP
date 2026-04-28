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
      select: { id: true, _count: { select: { evidenceItems: true } } }
    });
    if (!accessibleCase) return notFound();

    const where = { caseId: params.id };
    const evidenceItems = await prisma.evidenceItem.findMany({
      where,
      select: {
        id: true,
        caseId: true,
        documentId: true,
        label: true,
        summary: true,
        sourceType: true,
        evidenceStrength: true,
        createdAt: true,
        updatedAt: true,
        document: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            mimeType: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });
    const total = accessibleCase._count.evidenceItems;

    return NextResponse.json({
      evidenceItems,
      page,
      limit,
      total,
      hasMore: skip + evidenceItems.length < total
    });
  } catch (error) {
    return handleApiError(error, "CASE_EVIDENCE_ROUTE", "Unable to load case evidence.");
  }
}
