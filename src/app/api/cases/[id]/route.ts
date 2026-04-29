import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import path from "node:path";
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

function resolvePublicFilePath(filePath?: string | null) {
  if (!filePath || /^https?:\/\//i.test(filePath)) return "";

  const publicDir = path.resolve(process.cwd(), "public");
  const normalizedPath = filePath.replace(/\\/g, "/");
  const allowedPublicRoots = ["/uploads/", "/exports/", "/redactions/"];

  if (allowedPublicRoots.some((root) => normalizedPath.startsWith(root))) {
    const resolved = path.resolve(publicDir, `.${normalizedPath}`);
    return resolved.startsWith(publicDir + path.sep) ? resolved : "";
  }

  if (path.isAbsolute(filePath)) {
    const resolved = path.resolve(filePath);
    return resolved.startsWith(publicDir + path.sep) ? resolved : "";
  }

  return "";
}

async function deleteLocalPublicFile(filePath?: string | null, kind = "case_asset") {
  const resolved = resolvePublicFilePath(filePath);
  if (!resolved) return;

  try {
    await fs.unlink(resolved);
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
  documents: Array<{ id: string; filePath: string; metadata: unknown }>;
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

      await deleteLocalPublicFile(document.filePath, "document");
    }),
    ...input.exportBundles.map((bundle) => deleteLocalPublicFile(bundle.filePath, "export_bundle")),
    ...input.redactionJobs.map((job) => deleteLocalPublicFile(job.outputPath, "redaction"))
  ]);
}

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
    const clientProfileId = user.clientProfile.id;

    const body = deleteSchema.parse(await request.json().catch(() => ({})));
    const legalCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(user, params.id),
      select: {
        id: true,
        title: true,
        clientProfileId: true,
        documents: {
          select: {
            id: true,
            filePath: true,
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

      const [openWorkflowRecords, closedWorkflowRecords, activityLogs, notifications, deleted] = await Promise.all([
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
        tx.activityLog.deleteMany({
          where: { caseId: params.id }
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
          where: {
            id: params.id,
            clientProfileId
          }
        })
      ]);

      return { workflowRecords: openWorkflowRecords.count + closedWorkflowRecords.count, activityLogs, notifications, deleted };
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
      activityLogsDeleted: transactionResult.activityLogs.count,
      notificationsDeleted: transactionResult.notifications.count,
      assistantMessagesMarkedDeleted: assistantMessageUpdates.length
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "CASE_DELETE_ROUTE", "Unable to delete case.");
  }
}
