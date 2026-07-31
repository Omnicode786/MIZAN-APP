import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserWithProfile } from "@/lib/auth";
import {
  buildAccessibleCaseWhereForUser,
  canDeleteCaseForUser,
  canPermanentlyRemoveDocumentForUser
} from "@/lib/permission-rules";

export type AppUser = NonNullable<Awaited<ReturnType<typeof getCurrentUserWithProfile>>>;
export {
  buildAccessibleCaseWhereForUser,
  canDeleteCaseForUser,
  canPermanentlyRemoveDocumentForUser
};

export async function getAccessibleCaseForUser<T extends Prisma.CaseInclude | undefined = undefined>(
  user: AppUser,
  caseId: string,
  include?: T
) {
  return prisma.case.findFirst({
    where: buildAccessibleCaseWhereForUser(user, caseId),
    include
  });
}

export async function canAccessCase(user: AppUser, caseId: string) {
  const legalCase = await prisma.case.findFirst({
    where: buildAccessibleCaseWhereForUser(user, caseId),
    select: { id: true }
  });
  return Boolean(legalCase);
}

export async function assertClientOwnsCase(user: AppUser, caseId: string) {
  if (user.role !== "CLIENT" || !user.clientProfile) {
    throw new Error("Forbidden");
  }

  const legalCase = await prisma.case.findFirst({
    where: buildAccessibleCaseWhereForUser(user, caseId),
    select: { id: true, clientProfileId: true }
  });
  if (!legalCase) {
    throw new Error("Not found");
  }

  return legalCase;
}

export async function assertLawyerAssignedToCase(user: AppUser, caseId: string) {
  if (user.role !== "LAWYER" || !user.lawyerProfile) {
    throw new Error("Forbidden");
  }

  const legalCase = await prisma.case.findFirst({
    where: buildAccessibleCaseWhereForUser(user, caseId),
    select: { id: true }
  });
  if (!legalCase) {
    throw new Error("Not found");
  }

  return legalCase;
}

export async function requireUser() {
  const user = await getCurrentUserWithProfile();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAccessibleCase(caseId: string) {
  const user = await requireUser();
  const includeInternalNotes = user.role === "LAWYER";

  const legalCase = await prisma.case.findFirst({
    where: buildAccessibleCaseWhereForUser(user, caseId),
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
      contractFairness: true,
      draftReadiness: true,
      escalationReadiness: true,
      creatorId: true,
      clientProfileId: true,
      lawyerOwnerProfileId: true,
      lawyerRequestedAt: true,
      sharedWithLawyerAt: true,
      createdAt: true,
      updatedAt: true,
      client: {
        select: {
          id: true,
          phone: true,
          region: true,
          simpleLanguageMode: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      },
      assignments: {
        where:
          user.role === "LAWYER"
            ? {
                lawyerProfileId: user.lawyerProfile?.id || "__NO_LAWYER_PROFILE__",
                status: "ACCEPTED" as const
              }
            : undefined,
        select: {
          id: true,
          caseId: true,
          lawyerProfileId: true,
          status: true,
          proposalStatus: true,
          feeProposal: true,
          probability: true,
          proposalNotes: true,
          proposalSentAt: true,
          proposalDecidedAt: true,
          createdAt: true,
          updatedAt: true,
          lawyer: {
            select: {
              id: true,
              userId: true,
              firmName: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 20
      },
      internalNotes: includeInternalNotes
        ? {
            select: {
              id: true,
              authorId: true,
              body: true,
              createdAt: true
            },
            orderBy: { createdAt: "desc" },
            take: 5
          }
        : false,
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
          internalNotes: true,
          activityLogs:
            user.role === "CLIENT"
              ? {
                  where: {
                    action: {
                      notIn: ["INTERNAL_NOTE_ADDED", "DOCUMENT_REMOVAL_BLOCKED", "CASE_DELETE_CONFIRMED"]
                    }
                  }
                }
              : true,
          assistantThreads: {
            where: {
              createdById: user.id,
              ownerRole: user.role
            }
          },
          debateSessions: true
        }
      }
    }
  });

  const sanitizedCase =
    legalCase &&
    legalCase.client &&
    user.role === "LAWYER" &&
    legalCase.origin === "CLIENT_SUBMITTED" &&
    !legalCase.assignments.some((assignment) => assignment.proposalStatus === "ACCEPTED")
      ? {
          ...legalCase,
          client: {
            ...legalCase.client,
            phone: null,
            user: {
              ...legalCase.client.user,
              email: ""
            }
          }
        }
      : legalCase;

  return {
    user,
    legalCase:
      sanitizedCase && !includeInternalNotes
        ? ({ ...sanitizedCase, internalNotes: [] } as typeof sanitizedCase & { internalNotes: [] })
        : sanitizedCase
  };
}

export async function logActivity(caseId: string | null, actorId: string | null, action: string, detail?: string, metadata?: any) {
  return prisma.activityLog.create({
    data: { caseId: caseId || undefined, actorId: actorId || undefined, action, detail, metadata }
  });
}

export async function logCaseAudit(input: {
  caseId: string | null;
  actorId: string | null;
  action: string;
  detail?: string;
  previousValue?: Prisma.InputJsonValue;
  updatedValue?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}) {
  return logActivity(input.caseId, input.actorId, input.action, input.detail, {
    ...(input.metadata && typeof input.metadata === "object" ? (input.metadata as Record<string, unknown>) : {}),
    previousValue: input.previousValue ?? null,
    updatedValue: input.updatedValue ?? null,
    protectedAudit: true
  });
}

export async function createNotification(userId: string, title: string, body: string, kind: string, link?: string) {
  return prisma.notification.create({
    data: { userId, title, body, kind, link }
  });
}
