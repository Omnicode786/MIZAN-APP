import { prisma } from "@/lib/prisma";
import { getCurrentUserWithProfile } from "@/lib/auth";

export async function requireUser() {
  const user = await getCurrentUserWithProfile();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAccessibleCase(caseId: string) {
  const user = await requireUser();

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
      internalNotes: { include: { author: true }, orderBy: { createdAt: "desc" } },
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

  return { user, legalCase };
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
