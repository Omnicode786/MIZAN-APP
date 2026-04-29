import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, notFound, validationError } from "@/lib/api-response";
import { createNotification, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  mode: z.enum(["proposal", "decision"]),
  feeProposal: z.number().optional(),
  probability: z.number().min(0).max(1).optional(),
  proposalNotes: z.string().optional(),
  decision: z.enum(["ACCEPTED", "DECLINED"]).optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const assignment = await prisma.caseAssignment.findUnique({
      where: { id: params.id },
      include: {
        lawyer: { include: { user: true } },
        case: { include: { client: { include: { user: true } } } }
      }
    });
    if (!assignment) return notFound();

    const body = schema.parse(await request.json());
    const isAssignedLawyer = user.role === "LAWYER" && assignment.lawyer.userId === user.id;

    if (body.mode === "proposal") {
      if (!isAssignedLawyer) return forbidden();
      if (assignment.status !== "ACCEPTED") {
        return validationError("Accept the case request before updating collaboration terms.");
      }

      const updated = await prisma.caseAssignment.update({
        where: { id: params.id },
        data: {
          feeProposal: body.feeProposal,
          probability: body.probability,
          proposalNotes: body.proposalNotes
        },
        include: { lawyer: { include: { user: true } } }
      });

      await prisma.case.update({ where: { id: assignment.caseId }, data: { stage: "Lawyer engaged" } });
      await logActivity(assignment.caseId, user.id, "COLLABORATION_TERMS_UPDATED", `Updated collaboration terms for ${assignment.case.title}.`);
      await createNotification(
        assignment.case.client.userId,
        "Collaboration terms updated",
        `${assignment.lawyer.user.name} updated terms for ${assignment.case.title}.`,
        "collaboration_terms",
        `/client/cases/${assignment.caseId}`
      );
      return NextResponse.json({ assignment: updated });
    }

    if (!body.decision) return validationError("Decision is required.");
    if (!isAssignedLawyer) return forbidden();
    if (assignment.status !== "PENDING") {
      return validationError("Only pending case requests can be accepted or rejected.");
    }

    const acceptedAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const nextAssignment = await tx.caseAssignment.update({
        where: { id: params.id },
        data: {
          status: body.decision
        },
        include: { lawyer: { include: { user: true } } }
      });

      await tx.case.update({
        where: { id: assignment.caseId },
        data: {
          sharedWithLawyerAt: body.decision === "ACCEPTED" ? acceptedAt : assignment.case.sharedWithLawyerAt,
          stage: body.decision === "ACCEPTED" ? "Lawyer request accepted" : "Lawyer request rejected"
        }
      });

      return nextAssignment;
    });

    await logActivity(
      assignment.caseId,
      user.id,
      body.decision === "ACCEPTED" ? "LAWYER_REQUEST_ACCEPTED" : "LAWYER_REQUEST_REJECTED",
      `${assignment.lawyer.user.name} ${body.decision === "ACCEPTED" ? "accepted" : "rejected"} the case request.`
    );
    await createNotification(
      assignment.case.client.userId,
      body.decision === "ACCEPTED" ? "Case request accepted" : "Case request rejected",
      `${assignment.lawyer.user.name} ${body.decision === "ACCEPTED" ? "accepted" : "rejected"} your request for ${assignment.case.title}.`,
      "case_request_decision",
      `/client/cases/${assignment.caseId}`
    );

    return NextResponse.json({ assignment: updated });
  } catch (error) {
    return handleApiError(error, "ASSIGNMENT_UPDATE_ROUTE", "This action could not be completed.");
  }
}
