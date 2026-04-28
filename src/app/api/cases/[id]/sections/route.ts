import { NextResponse } from "next/server";
import { handleApiError, notFound } from "@/lib/api-response";
import { buildAccessibleCaseWhereForUser, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function readLimit(searchParams: URLSearchParams, key: string, fallback: number, max: number) {
  const value = Number(searchParams.get(key) || fallback);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), max);
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);

    const documentsLimit = readLimit(searchParams, "documentsLimit", 20, 50);
    const timelineLimit = readLimit(searchParams, "timelineLimit", 50, 100);
    const evidenceLimit = readLimit(searchParams, "evidenceLimit", 50, 100);
    const activityLimit = readLimit(searchParams, "activityLimit", 30, 100);

    const accessibleCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, params.id),
      select: {
        id: true,
        _count: {
          select: {
            documents: true,
            evidenceItems: true,
            timelineEvents: true,
            activityLogs: true
          }
        }
      }
    });

    if (!accessibleCase) return notFound();

    const [documents, timelineEvents, evidenceItems, activityLogs] = await Promise.all([
      prisma.document.findMany({
        where: { caseId: params.id },
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
        take: documentsLimit
      }),
      prisma.timelineEvent.findMany({
        where: { caseId: params.id },
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
        take: timelineLimit
      }),
      prisma.evidenceItem.findMany({
        where: { caseId: params.id },
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
        take: evidenceLimit
      }),
      prisma.activityLog.findMany({
        where: { caseId: params.id },
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
        take: activityLimit
      })
    ]);

    return NextResponse.json({
      documents,
      timelineEvents,
      evidenceItems,
      activityLogs,
      totals: {
        documents: accessibleCase._count.documents,
        timelineEvents: accessibleCase._count.timelineEvents,
        evidenceItems: accessibleCase._count.evidenceItems,
        activityLogs: accessibleCase._count.activityLogs
      },
      hasMore: {
        documents: documents.length < accessibleCase._count.documents,
        timelineEvents: timelineEvents.length < accessibleCase._count.timelineEvents,
        evidenceItems: evidenceItems.length < accessibleCase._count.evidenceItems,
        activityLogs: activityLogs.length < accessibleCase._count.activityLogs
      }
    });
  } catch (error) {
    return handleApiError(error, "CASE_SECTIONS_ROUTE", "Unable to load case sections.");
  }
}
