import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, notFound, validationError } from "@/lib/api-response";
import { createNotification, getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  lawyerProfileId: z.string()
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (user.role !== "CLIENT") return forbidden();

    const { legalCase } = await getAccessibleCase(params.id);
    if (!legalCase) return notFound();

    const body = schema.parse(await request.json());
    const lawyer = await prisma.lawyerProfile.findUnique({
      where: { id: body.lawyerProfileId },
      include: { user: true }
    });
    if (!lawyer || !lawyer.isPublic) return notFound();

    const existingAssignment = await prisma.caseAssignment.findUnique({
      where: {
        caseId_lawyerProfileId: {
          caseId: params.id,
          lawyerProfileId: body.lawyerProfileId
        }
      },
      select: { id: true, status: true }
    });
    if (existingAssignment?.status === "ACCEPTED") {
      return validationError("This lawyer already accepted the case request.");
    }

    const assignment = existingAssignment
      ? await prisma.caseAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            status: "PENDING",
            feeProposal: null,
            probability: null,
            proposalNotes: null
          },
          include: { lawyer: { include: { user: true } } }
        })
      : await prisma.caseAssignment.create({
          data: {
            caseId: params.id,
            lawyerProfileId: body.lawyerProfileId,
            status: "PENDING"
          },
          include: { lawyer: { include: { user: true } } }
        });

    await prisma.case.update({
      where: { id: params.id },
      data: {
        lawyerRequestedAt: new Date(),
        stage: "Lawyer review requested"
      }
    });

    await prisma.timelineEvent.create({
      data: {
        caseId: params.id,
        title: `Lawyer requested: ${lawyer.user.name}`,
        description: "Client shared the case for proposal review.",
        eventDate: new Date(),
        confidence: 1,
        sourceLabel: "system",
        isAiGenerated: false
      }
    });

    await logActivity(params.id, user.id, "LAWYER_REQUESTED", `Requested ${lawyer.user.name} for this case.`);
    await createNotification(
      lawyer.userId,
      "New case request",
      `${legalCase.client.user.name} requested your review for ${legalCase.title}.`,
      "case_request",
      `/lawyer/cases/${params.id}`
    );

    return NextResponse.json({ assignment });
  } catch (error) {
    return handleApiError(error, "CASE_SHARE_ROUTE", "Unable to send lawyer request.");
  }
}
