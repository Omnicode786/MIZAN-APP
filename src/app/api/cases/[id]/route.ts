import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, forbidden, handleApiError, notFound } from "@/lib/api-response";
import { buildAccessibleCaseWhereForUser, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(3).optional(),
  stage: z.string().optional(),
  status: z.enum(["DRAFT", "INTAKE", "ACTIVE", "REVIEW", "ESCALATED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  description: z.string().nullable().optional()
});

const deleteSchema = z.object({
  password: z.string().min(1)
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const legalCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, params.id),
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
        creatorId: true,
        clientProfileId: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        assignments: {
          select: {
            id: true,
            lawyerProfileId: true,
            status: true,
            feeProposal: true,
            probability: true,
            proposalNotes: true,
            lawyer: {
              select: {
                id: true,
                firmName: true,
                user: { select: { id: true, name: true, email: true } }
              }
            }
          },
          orderBy: { updatedAt: "desc" },
          take: 20
        },
        _count: {
          select: {
            documents: true,
            evidenceItems: true,
            timelineEvents: true,
            deadlines: true,
            drafts: true,
            comments: true,
            activityLogs: true
          }
        }
      }
    });
    if (!legalCase) return notFound();

    return NextResponse.json({ case: legalCase });
  } catch (error) {
    return handleApiError(error, "CASE_GET_ROUTE", "Unable to load case.");
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const legalCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, params.id),
      select: { id: true }
    });
    if (!legalCase) return notFound();

    const body = patchSchema.parse(await request.json());
    const updated = await prisma.case.update({
      where: { id: params.id },
      data: {
        title: body.title,
        stage: body.stage,
        status: body.status,
        priority: body.priority,
        description: body.description === undefined ? undefined : body.description || null
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
        updatedAt: true
      }
    });

    await logActivity(params.id, user.id, "CASE_UPDATED", `Updated case workspace fields.`);
    return NextResponse.json({ case: updated });
  } catch (error) {
    return handleApiError(error, "CASE_UPDATE_ROUTE", "Unable to update case.");
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (user.role !== "CLIENT" || !user.clientProfile) return forbidden();

    const body = deleteSchema.parse(await request.json().catch(() => ({})));
    const legalCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, params.id),
      select: { id: true }
    });
    if (!legalCase) return notFound();

    const passwordOwner = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true }
    });
    if (!passwordOwner) return notFound();

    const passwordIsValid = await bcrypt.compare(body.password, passwordOwner.passwordHash);
    if (!passwordIsValid) {
      return apiError("Invalid password.", 401);
    }

    const deleted = await prisma.case.deleteMany({
      where: {
        id: params.id,
        clientProfileId: user.clientProfile.id
      }
    });
    if (deleted.count === 0) return notFound();

    await logActivity(null, user.id, "CASE_DELETED", `Deleted case ${params.id}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "CASE_DELETE_ROUTE", "Unable to delete case.");
  }
}
