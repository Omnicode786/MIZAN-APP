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
    const { page, limit, skip } = getPagination(searchParams, { limit: 20, maxLimit: 50 });

    const accessibleCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, params.id),
      select: { id: true, _count: { select: { documents: true } } }
    });
    if (!accessibleCase) return notFound();

    const where = { caseId: params.id };
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        caseId: true,
        uploadedById: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        fileType: true,
        sourceType: true,
        probableCategory: true,
        aiSummary: true,
        tags: true,
        confidence: true,
        verificationStatus: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });
    const total = accessibleCase._count.documents;

    return NextResponse.json({
      documents,
      page,
      limit,
      total,
      hasMore: skip + documents.length < total
    });
  } catch (error) {
    return handleApiError(error, "CASE_DOCUMENTS_ROUTE", "Unable to load case documents.");
  }
}
