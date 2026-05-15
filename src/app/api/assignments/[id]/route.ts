import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, notFound, validationError } from "@/lib/api-response";
import { createNotification, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  mode: z.enum(["proposal", "decision", "proposalDecision"]),
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
      if (assignment.proposalStatus === "ACCEPTED") {
        return validationError("The client already accepted these collaboration terms.");
      }

      const updated = await prisma.caseAssignment.update({
        where: { id: params.id },
        data: {
          proposalStatus: "SENT",
          feeProposal: body.feeProposal,
          probability: body.probability,
          proposalNotes: body.proposalNotes,
          proposalSentAt: new Date(),
          proposalDecidedAt: null
        },
        include: { lawyer: { include: { user: true } } }
      });

      await prisma.case.update({ where: { id: assignment.caseId }, data: { stage: "Lawyer proposal sent" } });
      await logActivity(assignment.caseId, user.id, "LAWYER_PROPOSAL_SENT", `Sent collaboration terms for ${assignment.case.title}.`);
      await createNotification(
        assignment.case.client.userId,
        "Lawyer proposal ready",
        `${assignment.lawyer.user.name} sent collaboration terms for ${assignment.case.title}.`,
        "lawyer_proposal",
        `/client/cases/${assignment.caseId}`
      );
      return NextResponse.json({ assignment: updated });
    }

    if (body.mode === "proposalDecision") {
      if (!body.decision) return validationError("Decision is required.");
      const isOwningClient = user.role === "CLIENT" && user.clientProfile?.id === assignment.case.clientProfileId;
      if (!isOwningClient) return forbidden();
      if (assignment.status !== "ACCEPTED" || assignment.proposalStatus !== "SENT") {
        return validationError("Only sent lawyer proposals can be accepted or declined.");
      }

      const decidedAt = new Date();
      const accepted = body.decision === "ACCEPTED";
      const updated = await prisma.$transaction(async (tx) => {
        const nextAssignment = await tx.caseAssignment.update({
          where: { id: params.id },
          data: {
            status: accepted ? "ACCEPTED" : "DECLINED",
            proposalStatus: accepted ? "ACCEPTED" : "DECLINED",
            proposalDecidedAt: decidedAt
          },
          include: { lawyer: { include: { user: true } } }
        });

        await tx.case.update({
          where: { id: assignment.caseId },
          data: {
            sharedWithLawyerAt: accepted ? decidedAt : null,
            stage: accepted ? "Lawyer proposal accepted" : "Lawyer proposal declined"
          }
        });

        return nextAssignment;
      });

      await logActivity(
        assignment.caseId,
        user.id,
        accepted ? "LAWYER_PROPOSAL_ACCEPTED" : "LAWYER_PROPOSAL_DECLINED",
        `${assignment.case.client.user.name} ${accepted ? "accepted" : "declined"} ${assignment.lawyer.user.name}'s proposal.`
      );
      await createNotification(
        assignment.lawyer.userId,
        accepted ? "Proposal accepted" : "Proposal declined",
        `${assignment.case.client.user.name} ${accepted ? "accepted" : "declined"} your proposal for ${assignment.case.title}.`,
        "lawyer_proposal_decision",
        accepted ? `/lawyer/cases/${assignment.caseId}` : "/lawyer/review"
      );

      return NextResponse.json({ assignment: updated });
    }

    if (!body.decision) return validationError("Decision is required.");
    if (!isAssignedLawyer) return forbidden();
    if (assignment.status !== "PENDING") {
      return validationError("Only pending case requests can be accepted or rejected.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextAssignment = await tx.caseAssignment.update({
        where: { id: params.id },
        data: {
          status: body.decision,
          proposalStatus: body.decision === "ACCEPTED" ? "NOT_SENT" : "DECLINED"
        },
        include: { lawyer: { include: { user: true } } }
      });

      await tx.case.update({
        where: { id: assignment.caseId },
        data: {
          sharedWithLawyerAt: body.decision === "ACCEPTED" ? assignment.case.sharedWithLawyerAt : null,
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
