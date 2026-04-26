import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, notFound, validationError } from "@/lib/api-response";
import { createNotification, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["REQUESTED", "PROPOSED", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().int().min(15).max(240).optional(),
  feeAmount: z.number().min(0).optional(),
  paymentStatus: z.enum(["UNPAID", "PENDING", "PAID", "WAIVED"]).optional(),
  paymentReference: z.string().optional(),
  meetingMode: z.string().optional(),
  meetingLink: z.string().optional(),
  notes: z.string().optional()
});

function parseOptionalDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());

    const consultation = await prisma.consultationBooking.findUnique({
      where: { id: params.id },
      include: {
        case: true,
        client: { include: { user: true } },
        lawyer: { include: { user: true } }
      }
    });
    if (!consultation) return notFound();

    const isClient = user.role === "CLIENT" && user.clientProfile?.id === consultation.clientProfileId;
    const isLawyer = user.role === "LAWYER" && user.lawyerProfile?.id === consultation.lawyerProfileId;
    if (!isClient && !isLawyer) return forbidden();

    if (isClient && body.status && !["CONFIRMED", "CANCELLED"].includes(body.status)) {
      return validationError("Clients can only confirm or cancel consultations.");
    }

    if (isLawyer && body.paymentStatus === "PAID") {
      return validationError("Payment can only be marked from the client side.");
    }

    const updated = await prisma.consultationBooking.update({
      where: { id: consultation.id },
      data: {
        status: body.status,
        scheduledAt: parseOptionalDate(body.scheduledAt),
        durationMinutes: isLawyer ? body.durationMinutes : undefined,
        feeAmount: isLawyer ? body.feeAmount : undefined,
        paymentStatus: isClient ? body.paymentStatus : undefined,
        paymentReference: isClient ? body.paymentReference : undefined,
        meetingMode: isLawyer ? body.meetingMode : undefined,
        meetingLink: isLawyer ? body.meetingLink : undefined,
        notes: body.notes
      },
      include: {
        case: { select: { id: true, title: true } },
        client: { include: { user: true } },
        lawyer: { include: { user: true } }
      }
    });

    await logActivity(
      consultation.caseId,
      user.id,
      "CONSULTATION_UPDATED",
      `Updated consultation status to ${updated.status}.`
    );

    const targetUserId = isClient ? consultation.lawyer.userId : consultation.client.userId;
    await createNotification(
      targetUserId,
      "Consultation updated",
      `Consultation for ${consultation.case.title} is now ${updated.status}.`,
      "consultation",
      `/${isClient ? "lawyer" : "client"}/cases/${consultation.caseId}`
    );

    return NextResponse.json({ consultation: updated });
  } catch (error) {
    return handleApiError(error, "CONSULTATION_UPDATE_ROUTE", "Unable to update consultation.");
  }
}
