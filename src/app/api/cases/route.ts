import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, unauthorized } from "@/lib/api-response";
import { CASE_CATEGORIES } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoadmapForCase } from "@/lib/case-roadmap";
import { logActivity } from "@/lib/permissions";

const createCaseSchema = z.object({
  title: z.string().min(3),
  category: z.enum(CASE_CATEGORIES),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  description: z.string().optional()
});

export async function GET() {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user) return unauthorized();
    if (user.role === "LAWYER" && !user.lawyerProfile) return NextResponse.json({ cases: [] });
    if (user.role === "CLIENT" && !user.clientProfile) return NextResponse.json({ cases: [] });
    const lawyerProfileId = user.lawyerProfile?.id;
    const clientProfileId = user.clientProfile?.id;

    const cases =
      user.role === "LAWYER"
        ? await prisma.case.findMany({
            where: {
              assignments: {
                some: {
                  lawyerProfileId
                }
              }
            },
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
              priority: true,
              stage: true,
              description: true,
              caseHealthScore: true,
              evidenceCompleteness: true,
              evidenceStrength: true,
              deadlineRisk: true,
              draftReadiness: true,
              escalationReadiness: true,
              updatedAt: true,
              createdAt: true,
              _count: {
                select: {
                  documents: true,
                  deadlines: true,
                  drafts: true,
                  activityLogs: true
                }
              }
            },
            orderBy: { updatedAt: "desc" },
            take: 40
          })
        : await prisma.case.findMany({
            where: { clientProfileId },
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
              priority: true,
              stage: true,
              description: true,
              caseHealthScore: true,
              evidenceCompleteness: true,
              evidenceStrength: true,
              deadlineRisk: true,
              draftReadiness: true,
              escalationReadiness: true,
              updatedAt: true,
              createdAt: true,
              _count: {
                select: {
                  documents: true,
                  deadlines: true,
                  drafts: true,
                  activityLogs: true
                }
              }
            },
            orderBy: { updatedAt: "desc" },
            take: 40
          });

    return NextResponse.json({ cases });
  } catch (error) {
    return handleApiError(error, "CASES_LIST_ROUTE", "Unable to load cases.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user) return unauthorized();
    if (user.role !== "CLIENT" || !user.clientProfile) return forbidden();

    const body = createCaseSchema.parse(await request.json());

    const legalCase = await prisma.case.create({
      data: {
        title: body.title,
        category: body.category,
        priority: body.priority || "MEDIUM",
        description: body.description,
        creatorId: user.id,
        clientProfileId: user.clientProfile.id,
        status: "INTAKE",
        stage: "Document intake",
        caseHealthScore: 12,
        evidenceCompleteness: 0,
        evidenceStrength: 0,
        draftReadiness: 0,
        deadlineRisk: 0,
        escalationReadiness: 0,
        timelineEvents: {
          create: [
            {
              title: "Case opened",
              description: "A new legal matter has been created.",
              eventDate: new Date(),
              confidence: 1,
              sourceLabel: "system",
              isAiGenerated: false
            },
            ...getRoadmapForCase(body.category).map((item) => ({
              title: item.title,
              description: item.description,
              eventDate: item.eventDate,
              confidence: item.confidence,
              sourceLabel: item.sourceLabel,
              isAiGenerated: item.isAiGenerated
            }))
          ]
        }
      },
      include: {
        timelineEvents: true
      }
    });

    await logActivity(legalCase.id, user.id, "CASE_CREATED", `Created case: ${legalCase.title}`);

    return NextResponse.json({ case: legalCase });
  } catch (error) {
    return handleApiError(error, "CASES_CREATE_ROUTE", "Unable to create case.");
  }
}
