import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, unauthorized } from "@/lib/api-response";
import { CASE_CATEGORIES } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoadmapForCase } from "@/lib/case-roadmap";
import { buildAccessibleCaseWhereForUser, logActivity } from "@/lib/permissions";

const createCaseSchema = z.object({
  title: z.string().min(3),
  category: z.enum(CASE_CATEGORIES),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  description: z.string().optional(),
  parties: z.array(z.string().min(1)).optional(),
  jurisdiction: z.string().optional(),
  status: z.enum(["DRAFT", "INTAKE", "ACTIVE", "REVIEW", "ESCALATED", "CLOSED"]).optional(),
  stage: z.string().optional(),
  notes: z.string().optional(),
  deadlines: z
    .array(
      z.object({
        title: z.string().min(2),
        dueDate: z.string(),
        notes: z.string().optional(),
        importance: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional()
      })
    )
    .optional()
});

export async function GET() {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user) return unauthorized();
    if (user.role !== "CLIENT" && user.role !== "LAWYER") return forbidden();
    if (user.role === "LAWYER" && !user.lawyerProfile) return NextResponse.json({ cases: [] });
    if (user.role === "CLIENT" && !user.clientProfile) return NextResponse.json({ cases: [] });
    const clientProfileId = user.clientProfile?.id || "__NO_CLIENT_PROFILE__";

    const cases =
      user.role === "LAWYER"
        ? await prisma.case.findMany({
            where: buildAccessibleCaseWhereForUser(user),
            select: {
              id: true,
              title: true,
              category: true,
              origin: true,
              status: true,
              priority: true,
              stage: true,
              description: true,
              parties: true,
              jurisdiction: true,
              clientProfileId: true,
              lawyerOwnerProfileId: true,
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
              origin: true,
              status: true,
              priority: true,
              stage: true,
              description: true,
              parties: true,
              jurisdiction: true,
              clientProfileId: true,
              lawyerOwnerProfileId: true,
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
    if (user.role === "CLIENT" && !user.clientProfile) return forbidden();
    if (user.role === "LAWYER" && !user.lawyerProfile) return forbidden();
    if (user.role !== "CLIENT" && user.role !== "LAWYER" && user.role !== "ADMIN") return forbidden();

    const body = createCaseSchema.parse(await request.json());
    const cleanedParties = Array.from(new Set((body.parties || []).map((party) => party.trim()).filter(Boolean)));
    const validDeadlines =
      body.deadlines
        ?.map((deadline) => ({
          ...deadline,
          dueDateValue: new Date(deadline.dueDate)
        }))
        .filter((deadline) => !Number.isNaN(deadline.dueDateValue.getTime())) || [];
    const origin =
      user.role === "LAWYER" ? "LAWYER_CREATED" : user.role === "ADMIN" ? "ADMIN_CREATED" : "CLIENT_SUBMITTED";
    const stage =
      body.stage?.trim() ||
      (origin === "LAWYER_CREATED" ? "Private lawyer case opened" : "Document intake");

    const legalCase = await prisma.case.create({
      data: {
        title: body.title,
        category: body.category,
        origin,
        priority: body.priority || "MEDIUM",
        description: body.description,
        parties: cleanedParties,
        jurisdiction: body.jurisdiction?.trim() || null,
        creatorId: user.id,
        clientProfileId: user.role === "CLIENT" ? user.clientProfile!.id : null,
        lawyerOwnerProfileId: user.role === "LAWYER" ? user.lawyerProfile!.id : null,
        status: body.status || (origin === "LAWYER_CREATED" ? "ACTIVE" : "INTAKE"),
        stage,
        caseHealthScore: 12,
        evidenceCompleteness: 0,
        evidenceStrength: 0,
        draftReadiness: 0,
        deadlineRisk: 0,
        escalationReadiness: 0,
        internalNotes:
          body.notes && user.role === "LAWYER"
            ? {
                create: {
                  authorId: user.id,
                  body: body.notes
                }
              }
            : undefined,
        deadlines: validDeadlines.length
          ? {
              create: validDeadlines.map((deadline) => ({
                title: deadline.title,
                dueDate: deadline.dueDateValue,
                notes: deadline.notes,
                importance: deadline.importance || "MEDIUM",
                isAiDetected: false
              }))
            }
          : undefined,
        timelineEvents: {
          create: [
            {
              title: origin === "LAWYER_CREATED" ? "Private lawyer case opened" : "Case opened",
              description:
                origin === "LAWYER_CREATED"
                  ? "A lawyer-created private matter was opened in the workspace."
                  : "A new legal matter has been created.",
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
        timelineEvents: true,
        deadlines: true,
        internalNotes: true
      }
    });

    await logActivity(legalCase.id, user.id, "CASE_CREATED", `Created case: ${legalCase.title}`, {
      origin,
      jurisdiction: body.jurisdiction || null,
      parties: cleanedParties
    });

    return NextResponse.json({ case: legalCase });
  } catch (error) {
    return handleApiError(error, "CASES_CREATE_ROUTE", "Unable to create case.");
  }
}
