import { NextResponse } from "next/server";
import { z } from "zod";
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
  const user = await getCurrentUserWithProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cases =
    user.role === "LAWYER"
      ? await prisma.case.findMany({
          where: {
            assignments: {
              some: {
                lawyerProfileId: user.lawyerProfile?.id
              }
            }
          },
          include: {
            assignments: { include: { lawyer: { include: { user: true } } } },
            deadlines: true,
            documents: true
          },
          orderBy: { updatedAt: "desc" }
        })
      : await prisma.case.findMany({
          where: { clientProfileId: user.clientProfile?.id },
          include: {
            assignments: { include: { lawyer: { include: { user: true } } } },
            deadlines: true,
            documents: true
          },
          orderBy: { updatedAt: "desc" }
        });

  return NextResponse.json({ cases });
}

export async function POST(request: Request) {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "CLIENT" || !user.clientProfile) {
    return NextResponse.json({ error: "Only clients can create cases." }, { status: 403 });
  }

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
}
