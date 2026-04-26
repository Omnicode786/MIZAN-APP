import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, notFound, validationError } from "@/lib/api-response";
import {
  buildAccessibleCaseWhereForUser,
  createNotification,
  logActivity,
  requireUser
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  caseId: z.string().optional()
});

const createSchema = z.object({
  caseId: z.string(),
  assignmentId: z.string().optional(),
  lawyerProfileId: z.string().optional(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().int().min(15).max(240).optional(),
  feeAmount: z.number().min(0).optional(),
  meetingMode: z.string().optional(),
  meetingLink: z.string().optional(),
  notes: z.string().optional()
});

function parseOptionalDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const query = querySchema.parse({
      caseId: url.searchParams.get("caseId") || undefined
    });

    const where =
      user.role === "LAWYER"
        ? {
            lawyerProfileId: user.lawyerProfile?.id || "__NO_LAWYER_PROFILE__",
            caseId: query.caseId
          }
        : {
            clientProfileId: user.clientProfile?.id || "__NO_CLIENT_PROFILE__",
            caseId: query.caseId
          };

    const consultations = await prisma.consultationBooking.findMany({
      where,
      include: {
        case: { select: { id: true, title: true } },
        lawyer: { include: { user: true } },
        client: { include: { user: true } },
        assignment: true
      },
      orderBy: { updatedAt: "desc" },
      take: 50
    });

    return NextResponse.json({ consultations });
  } catch (error) {
    return handleApiError(error, "CONSULTATION_LIST_ROUTE", "Unable to load consultations.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await request.json());

    const legalCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, body.caseId),
      include: {
        client: { include: { user: true } },
        assignments: { include: { lawyer: { include: { user: true } } } }
      }
    });
    if (!legalCase) return notFound();

    const scheduledAt = parseOptionalDate(body.scheduledAt);

    if (user.role === "CLIENT") {
      if (!user.clientProfile || legalCase.clientProfileId !== user.clientProfile.id) return forbidden();

      let assignment = body.assignmentId
        ? legalCase.assignments.find((item) => item.id === body.assignmentId)
        : null;

      if (!assignment && body.lawyerProfileId) {
        const lawyer = await prisma.lawyerProfile.findFirst({
          where: { id: body.lawyerProfileId, isPublic: true },
          include: { user: true }
        });
        if (!lawyer) return notFound();

        assignment = await prisma.caseAssignment.upsert({
          where: {
            caseId_lawyerProfileId: {
              caseId: legalCase.id,
              lawyerProfileId: lawyer.id
            }
          },
          create: {
            caseId: legalCase.id,
            lawyerProfileId: lawyer.id,
            status: "PENDING"
          },
          update: { status: "PENDING" },
          include: { lawyer: { include: { user: true } } }
        });
      }

      if (!assignment) return validationError("Please select a lawyer first.");

      const consultation = await prisma.consultationBooking.create({
        data: {
          caseId: legalCase.id,
          clientProfileId: user.clientProfile.id,
          lawyerProfileId: assignment.lawyerProfileId,
          assignmentId: assignment.id,
          requestedById: user.id,
          status: "REQUESTED",
          scheduledAt,
          durationMinutes: body.durationMinutes || 30,
          feeAmount: body.feeAmount,
          meetingMode: body.meetingMode || "ONLINE",
          notes: body.notes
        },
        include: {
          lawyer: { include: { user: true } },
          client: { include: { user: true } },
          case: true
        }
      });

      await logActivity(legalCase.id, user.id, "CONSULTATION_REQUESTED", "Requested a paid consultation.");
      await createNotification(
        assignment.lawyer.userId,
        "Consultation requested",
        `${legalCase.client.user.name} requested a consultation for ${legalCase.title}.`,
        "consultation",
        `/lawyer/cases/${legalCase.id}`
      );

      return NextResponse.json({ consultation });
    }

    if (user.role !== "LAWYER" || !user.lawyerProfile) return forbidden();

    const assignment = legalCase.assignments.find((item) => item.lawyerProfileId === user.lawyerProfile?.id);
    if (!assignment) return forbidden();

    const consultation = await prisma.consultationBooking.create({
      data: {
        caseId: legalCase.id,
        clientProfileId: legalCase.clientProfileId,
        lawyerProfileId: user.lawyerProfile.id,
        assignmentId: assignment.id,
        requestedById: user.id,
        status: "PROPOSED",
        scheduledAt,
        durationMinutes: body.durationMinutes || 30,
        feeAmount: body.feeAmount,
        meetingMode: body.meetingMode || "ONLINE",
        meetingLink: body.meetingLink,
        notes: body.notes
      },
      include: {
        lawyer: { include: { user: true } },
        client: { include: { user: true } },
        case: true
      }
    });

    await logActivity(legalCase.id, user.id, "CONSULTATION_PROPOSED", "Proposed a paid consultation.");
    await createNotification(
      legalCase.client.userId,
      "Consultation proposed",
      `${user.name} proposed a consultation for ${legalCase.title}.`,
      "consultation",
      `/client/cases/${legalCase.id}`
    );

    return NextResponse.json({ consultation });
  } catch (error) {
    return handleApiError(error, "CONSULTATION_CREATE_ROUTE", "Unable to create consultation.");
  }
}
