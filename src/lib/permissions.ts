import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserWithProfile } from "@/lib/auth";

export type AppUser = NonNullable<Awaited<ReturnType<typeof getCurrentUserWithProfile>>>;

export function buildAccessibleCaseWhereForUser(user: AppUser, caseId?: string): Prisma.CaseWhereInput {
  const baseWhere =
    user.role === "LAWYER"
      ? {
          assignments: {
            some: {
              lawyerProfileId: user.lawyerProfile?.id || "__NO_LAWYER_PROFILE__"
            }
          }
        }
      : {
          clientProfileId: user.clientProfile?.id || "__NO_CLIENT_PROFILE__"
        };

  if (!caseId) {
    return baseWhere;
  }

  return {
    AND: [baseWhere, { id: caseId }]
  };
}

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
    where:
      user.role === "LAWYER"
        ? {
            id: caseId,
            assignments: {
              some: {
                lawyerProfileId: user.lawyerProfile?.id
              }
            }
          }
        : {
            id: caseId,
            clientProfileId: user.clientProfile?.id
          },
    include: {
      client: { include: { user: true } },
      assignments: { include: { lawyer: { include: { user: true } } } },
      documents: { orderBy: { createdAt: "desc" } },
      evidenceItems: { orderBy: { createdAt: "desc" } },
      timelineEvents: { orderBy: { eventDate: "asc" } },
      deadlines: { orderBy: { dueDate: "asc" } },
      drafts: { include: { versions: { orderBy: { versionNumber: "desc" } } }, orderBy: { updatedAt: "desc" } },
      comments: { include: { author: true }, orderBy: { createdAt: "desc" } },
      internalNotes: includeInternalNotes
        ? { include: { author: true }, orderBy: { createdAt: "desc" } }
        : false,
      riskScores: true,
      activityLogs: { include: { actor: true }, orderBy: { createdAt: "desc" } },
      assistantThreads: {
        orderBy: { updatedAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" } } }
      },
      debateSessions: {
        orderBy: { createdAt: "desc" },
        include: { turns: { orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }] } }
      }
    }
  });

  return {
    user,
    legalCase:
      legalCase && !includeInternalNotes
        ? ({ ...legalCase, internalNotes: [] } as typeof legalCase & { internalNotes: [] })
        : legalCase
  };
}

export async function logActivity(caseId: string | null, actorId: string | null, action: string, detail?: string, metadata?: any) {
  return prisma.activityLog.create({
    data: { caseId: caseId || undefined, actorId: actorId || undefined, action, detail, metadata }
  });
}

export async function createNotification(userId: string, title: string, body: string, kind: string, link?: string) {
  return prisma.notification.create({
    data: { userId, title, body, kind, link }
  });
}
