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
    const { page, limit, skip } = getPagination(searchParams, { limit: 20, maxLimit: 50 });

    const where = { caseId: params.id };
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
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
      }),
      prisma.document.count({ where })
    ]);

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
