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

const consultationSelect = {
  id: true,
  caseId: true,
  clientProfileId: true,
  lawyerProfileId: true,
  assignmentId: true,
  requestedById: true,
  status: true,
  scheduledAt: true,
  durationMinutes: true,
  feeAmount: true,
  paymentStatus: true,
  paymentReference: true,
  meetingMode: true,
  meetingLink: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  case: { select: { id: true, title: true } },
  lawyer: {
    select: {
      id: true,
      firmName: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } }
    }
  },
  client: {
    select: {
      id: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } }
    }
  },
  assignment: {
    select: {
      id: true,
      status: true,
      feeProposal: true,
      probability: true
    }
  }
};

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
            assignment: {
              status: "ACCEPTED" as const
            },
            caseId: query.caseId
          }
        : {
            clientProfileId: user.clientProfile?.id || "__NO_CLIENT_PROFILE__",
            caseId: query.caseId
          };

    const consultations = await prisma.consultationBooking.findMany({
      where,
      select: consultationSelect,
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
      select: {
        id: true,
        title: true,
        clientProfileId: true,
        client: {
          select: {
            userId: true,
            user: { select: { id: true, name: true, email: true } }
          }
        },
        assignments: {
          where: { status: "ACCEPTED" },
          select: {
            id: true,
            lawyerProfileId: true,
            status: true,
            lawyer: {
              select: {
                id: true,
                userId: true,
                user: { select: { id: true, name: true, email: true } }
              }
            }
          },
          take: 50
        }
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
        assignment =
          legalCase.assignments.find((item) => item.lawyerProfileId === body.lawyerProfileId) || null;
      }

      if (!assignment) return validationError("The lawyer must accept the case request before consultations can be created.");

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
        select: consultationSelect
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
      select: consultationSelect
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
