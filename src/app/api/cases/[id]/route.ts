import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiError, forbidden, handleApiError, notFound } from "@/lib/api-response";
import {
  appendAssistantActionMeta,
  extractAssistantActionMeta
} from "@/lib/assistant-message-meta";
import { deleteFromCloudinary, getCloudinaryStorageMeta } from "@/lib/cloudinary-storage";
import { recordStorageMetric, trackError } from "@/lib/observability";
import { buildAccessibleCaseWhereForUser, canDeleteCaseForUser, logActivity, logCaseAudit, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { unlinkStoredLocalFile } from "@/lib/secure-file-access";

const patchSchema = z.object({
  title: z.string().min(3).optional(),
  stage: z.string().optional(),
  status: z.enum(["DRAFT", "INTAKE", "ACTIVE", "REVIEW", "ESCALATED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  description: z.string().nullable().optional(),
  parties: z.array(z.string().min(1)).optional(),
  jurisdiction: z.string().nullable().optional()
});

const deleteSchema = z.object({
  password: z.string().min(1)
});

const CASE_DELETED_RESULT_MESSAGE =
  "This case was deleted. The AI workflow record is kept for history, but the case workspace is no longer available.";

function isCaseHrefForDeletedCase(href: string | undefined, caseId: string) {
  if (!href) return false;
  return new RegExp(`/(client|lawyer)/cases/${caseId}(?:$|[/?#])`).test(href);
}

function buildDeletedCaseAction(caseId: string, caseTitle: string, deletedAt: Date): Prisma.InputJsonValue {
  return {
    caseDeleted: true,
    deletedCaseId: caseId,
    deletedCaseTitle: caseTitle,
    deletedAt: deletedAt.toISOString(),
    action: {
      type: "case_deleted",
      label: "Case deleted"
    }
  };
}

function markAssistantMessageCaseDeleted(content: string, caseId: string) {
  const meta = extractAssistantActionMeta(content);
  if (!meta || !isCaseHrefForDeletedCase(meta.action?.href, caseId)) return null;

  return appendAssistantActionMeta(content, {
    ...meta,
    status: "info",
    message: CASE_DELETED_RESULT_MESSAGE,
    action: {
      type: "case_deleted",
      label: "Case deleted"
    }
  });
}

async function deleteStoredLocalFile(filePath?: string | null, storageKey?: string | null, kind = "case_asset") {
  if (!filePath || /^https?:\/\//i.test(filePath)) return;
  try {
    await unlinkStoredLocalFile(filePath, storageKey);
    recordStorageMetric(`case.delete.${kind}.local_file`, true, { filePath });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : "";
    if (code === "ENOENT") {
      recordStorageMetric(`case.delete.${kind}.local_file_missing`, true, { filePath });
      return;
    }
    recordStorageMetric(`case.delete.${kind}.local_file`, false, { filePath });
    trackError("case.delete.local_file", error, { filePath, kind });
  }
}

async function cleanupDeletedCaseAssets(input: {
  documents: Array<{ id: string; filePath: string; storageKey: string | null; metadata: unknown }>;
  exportBundles: Array<{ id: string; filePath: string }>;
  redactionJobs: Array<{ id: string; outputPath: string | null }>;
}) {
  await Promise.all([
    ...input.documents.map(async (document) => {
      const cloudinaryMeta = getCloudinaryStorageMeta(document.metadata);
      if (cloudinaryMeta?.publicId) {
        try {
          await deleteFromCloudinary(cloudinaryMeta.publicId, cloudinaryMeta.resourceType);
        } catch (error) {
          trackError("case.delete.cloudinary_document", error, { documentId: document.id });
        }
      }

      await deleteStoredLocalFile(document.filePath, document.storageKey, "document");
    }),
    ...input.exportBundles.map((bundle) => deleteStoredLocalFile(bundle.filePath, null, "export_bundle")),
    ...input.redactionJobs.map((job) => deleteStoredLocalFile(job.outputPath, null, "redaction"))
  ]);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const assignmentWhere =
      user.role === "LAWYER" && user.lawyerProfile
        ? { lawyerProfileId: user.lawyerProfile.id, status: "ACCEPTED" as const }
        : undefined;
    const legalCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, params.id),
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
        caseHealthScore: true,
        evidenceCompleteness: true,
        evidenceStrength: true,
        deadlineRisk: true,
        draftReadiness: true,
        escalationReadiness: true,
        creatorId: true,
        clientProfileId: true,
        lawyerOwnerProfileId: true,
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
          where: assignmentWhere,
          select: {
            id: true,
            lawyerProfileId: true,
            status: true,
            proposalStatus: true,
            feeProposal: true,
            probability: true,
            proposalNotes: true,
            proposalSentAt: true,
            proposalDecidedAt: true,
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
            comments:
              user.role === "CLIENT"
                ? {
                    where: { visibility: "SHARED" as const }
                  }
                : true,
            activityLogs:
              user.role === "CLIENT"
                ? {
                    where: {
                      action: {
                        notIn: ["INTERNAL_NOTE_ADDED", "DOCUMENT_REMOVAL_BLOCKED", "CASE_DELETE_CONFIRMED"]
                      }
                    }
                  }
                : true
          }
        }
      }
    });
    if (!legalCase) return notFound();

    const visibleCase =
      user.role === "LAWYER" &&
      legalCase.origin === "CLIENT_SUBMITTED" &&
      legalCase.client &&
      !legalCase.assignments.some((assignment) => assignment.proposalStatus === "ACCEPTED")
        ? {
            ...legalCase,
            client: {
              ...legalCase.client,
              user: {
                ...legalCase.client.user,
                email: ""
              }
            }
          }
        : legalCase;

    return NextResponse.json({ case: visibleCase });
  } catch (error) {
    return handleApiError(error, "CASE_GET_ROUTE", "Unable to load case.");
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const legalCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, params.id),
      select: {
        id: true,
        title: true,
        stage: true,
        status: true,
        priority: true,
        description: true,
        parties: true,
        jurisdiction: true
      }
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
        description: body.description === undefined ? undefined : body.description || null,
        parties: body.parties?.map((party) => party.trim()).filter(Boolean),
        jurisdiction: body.jurisdiction === undefined ? undefined : body.jurisdiction || null
      },
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
        caseHealthScore: true,
        evidenceCompleteness: true,
        evidenceStrength: true,
        deadlineRisk: true,
        draftReadiness: true,
        escalationReadiness: true,
        updatedAt: true
      }
    });

    await logCaseAudit({
      caseId: params.id,
      actorId: user.id,
      action: "CASE_UPDATED",
      detail: "Updated case workspace fields.",
      previousValue: {
        title: legalCase.title,
        stage: legalCase.stage,
        status: legalCase.status,
        priority: legalCase.priority,
        description: legalCase.description,
        parties: legalCase.parties,
        jurisdiction: legalCase.jurisdiction
      },
      updatedValue: {
        title: updated.title,
        stage: updated.stage,
        status: updated.status,
        priority: updated.priority,
        description: updated.description,
        parties: updated.parties,
        jurisdiction: updated.jurisdiction
      }
    });
    return NextResponse.json({ case: updated });
  } catch (error) {
    return handleApiError(error, "CASE_UPDATE_ROUTE", "Unable to update case.");
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (user.role !== "CLIENT" && user.role !== "LAWYER" && user.role !== "ADMIN") return forbidden();

    const body = deleteSchema.parse(await request.json().catch(() => ({})));
    const legalCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, params.id),
      select: {
        id: true,
        title: true,
        clientProfileId: true,
        lawyerOwnerProfileId: true,
        origin: true,
        documents: {
          select: {
            id: true,
            filePath: true,
            storageKey: true,
            metadata: true
          }
        },
        exportBundles: {
          select: {
            id: true,
            filePath: true
          }
        },
        redactionJobs: {
          select: {
            id: true,
            outputPath: true
          }
        }
      }
    });
    if (!legalCase) return notFound();
    if (!canDeleteCaseForUser(user, legalCase)) return forbidden();

    const passwordOwner = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true }
    });
    if (!passwordOwner) return notFound();

    const passwordIsValid = await bcrypt.compare(body.password, passwordOwner.passwordHash);
    if (!passwordIsValid) {
      return apiError("Invalid password.", 401);
    }

    const deletedAt = new Date();
    const deletedCaseAction = buildDeletedCaseAction(params.id, legalCase.title, deletedAt);
    const reviewWhere: Prisma.AgentActionReviewWhereInput = {
      OR: [
        { caseId: params.id },
        { document: { caseId: params.id } },
        { assistantThread: { caseId: params.id } },
        { assistantMessage: { thread: { caseId: params.id } } }
      ]
    };
    const assistantMessages = await prisma.assistantMessage.findMany({
      where: {
        content: {
          contains: params.id
        }
      },
      select: {
        id: true,
        content: true
      }
    });
    const assistantMessageUpdates = assistantMessages
      .map((message) => ({
        id: message.id,
        content: markAssistantMessageCaseDeleted(message.content, params.id)
      }))
      .filter((message): message is { id: string; content: string } => Boolean(message.content));

    const transactionResult = await prisma.$transaction(async (tx) => {
      for (const message of assistantMessageUpdates) {
        await tx.assistantMessage.update({
          where: { id: message.id },
          data: { content: message.content }
        });
      }

      await tx.activityLog.create({
        data: {
          caseId: params.id,
          actorId: user.id,
          action: "CASE_DELETE_CONFIRMED",
          detail: `Deletion confirmed for case ${legalCase.title}.`,
          metadata: {
            deletedCaseId: params.id,
            deletedCaseTitle: legalCase.title,
            deletedAt: deletedAt.toISOString(),
            origin: legalCase.origin,
            protectedAudit: true
          }
        }
      });

      const [openWorkflowRecords, closedWorkflowRecords, notifications, deleted] = await Promise.all([
        tx.agentActionReview.updateMany({
          where: {
            AND: [
              reviewWhere,
              {
                status: {
                  in: ["PENDING", "PROCESSING"]
                }
              }
            ]
          },
          data: {
            status: "FAILED",
            caseId: null,
            documentId: null,
            assistantThreadId: null,
            assistantMessageId: null,
            reviewedAt: deletedAt,
            resultMessage: CASE_DELETED_RESULT_MESSAGE,
            resultAction: deletedCaseAction
          }
        }),
        tx.agentActionReview.updateMany({
          where: {
            AND: [
              reviewWhere,
              {
                status: {
                  notIn: ["PENDING", "PROCESSING"]
                }
              }
            ]
          },
          data: {
            caseId: null,
            documentId: null,
            assistantThreadId: null,
            assistantMessageId: null,
            resultMessage: CASE_DELETED_RESULT_MESSAGE,
            resultAction: deletedCaseAction
          }
        }),
        tx.notification.deleteMany({
          where: {
            OR: [
              { link: `/client/cases/${params.id}` },
              { link: `/lawyer/cases/${params.id}` }
            ]
          }
        }),
        tx.case.deleteMany({
          where: { id: params.id }
        })
      ]);

      return { workflowRecords: openWorkflowRecords.count + closedWorkflowRecords.count, notifications, deleted };
    });
    if (transactionResult.deleted.count === 0) return notFound();

    await cleanupDeletedCaseAssets({
      documents: legalCase.documents,
      exportBundles: legalCase.exportBundles,
      redactionJobs: legalCase.redactionJobs
    });

    await logActivity(null, user.id, "CASE_DELETED", `Deleted case ${params.id}`, {
      caseTitle: legalCase.title,
      workflowRecordsDetached: transactionResult.workflowRecords,
      activityLogsPreserved: true,
      notificationsDeleted: transactionResult.notifications.count,
      assistantMessagesMarkedDeleted: assistantMessageUpdates.length
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "CASE_DELETE_ROUTE", "Unable to delete case.");
  }
}
