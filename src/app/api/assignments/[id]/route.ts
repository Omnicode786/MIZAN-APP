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

    if (body.mode === "proposal") {
      if (user.role !== "LAWYER" || assignment.lawyer.userId !== user.id) return forbidden();

      const updated = await prisma.caseAssignment.update({
        where: { id: params.id },
        data: {
          feeProposal: body.feeProposal,
          probability: body.probability,
          proposalNotes: body.proposalNotes,
          status: "PENDING"
        },
        include: { lawyer: { include: { user: true } } }
      });

      await prisma.case.update({ where: { id: assignment.caseId }, data: { stage: "Proposal received" } });
      await logActivity(assignment.caseId, user.id, "PROPOSAL_SENT", `Sent proposal for ${assignment.case.title}.`);
      await createNotification(
        assignment.case.client.userId,
        "Proposal received",
        `${assignment.lawyer.user.name} sent a proposal for ${assignment.case.title}.`,
        "proposal",
        `/client/cases/${assignment.caseId}`
      );
      return NextResponse.json({ assignment: updated });
    }

    if (!body.decision) return validationError("Decision is required.");
    if (user.role !== "CLIENT" || assignment.case.client.userId !== user.id) return forbidden();

    const updated = await prisma.caseAssignment.update({
      where: { id: params.id },
      data: {
        status: body.decision
      },
      include: { lawyer: { include: { user: true } } }
    });

    await prisma.case.update({
      where: { id: assignment.caseId },
      data: {
        sharedWithLawyerAt: body.decision === "ACCEPTED" ? new Date() : assignment.case.sharedWithLawyerAt,
        stage: body.decision === "ACCEPTED" ? "Lawyer engaged" : "Proposal declined"
      }
    });

    await logActivity(assignment.caseId, user.id, body.decision === "ACCEPTED" ? "PROPOSAL_ACCEPTED" : "PROPOSAL_DECLINED", `Client ${body.decision === "ACCEPTED" ? "accepted" : "declined"} the proposal.`);
    await createNotification(
      assignment.lawyer.userId,
      body.decision === "ACCEPTED" ? "Proposal approved" : "Proposal declined",
      `${assignment.case.client.user.name} ${body.decision === "ACCEPTED" ? "approved" : "declined"} your proposal for ${assignment.case.title}.`,
      "proposal_decision",
      `/lawyer/cases/${assignment.caseId}`
    );

    return NextResponse.json({ assignment: updated });
  } catch (error) {
    return handleApiError(error, "ASSIGNMENT_UPDATE_ROUTE", "This action could not be completed.");
  }
}
