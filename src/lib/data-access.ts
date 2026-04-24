import { prisma } from "@/lib/prisma";
import { getCurrentUserWithProfile, getSession } from "@/lib/auth";

export async function getWorkspaceUser(preferredRole: "CLIENT" | "LAWYER") {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== preferredRole) return session;
  return session;
}

export async function getCasesForRole(role: "CLIENT" | "LAWYER") {
  const user = await getCurrentUserWithProfile();
  if (!user) return [];

  if (role === "LAWYER") {
    return prisma.case.findMany({
      where: {
        assignments: {
          some: {
            lawyerProfileId: user.lawyerProfile?.id
          }
        }
      },
      include: {
        assignments: { include: { lawyer: { include: { user: true } } } },
        deadlines: true,
        documents: true
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  return prisma.case.findMany({
    where: { clientProfileId: user.clientProfile?.id },
    include: {
      assignments: { include: { lawyer: { include: { user: true } } } },
      deadlines: true,
      documents: true
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getCaseDetail(caseId?: string) {
  if (!caseId) return null;
  const user = await getCurrentUserWithProfile();
  if (!user) return null;

  return prisma.case.findFirst({
    where:
      user.role === "LAWYER"
        ? {
            id: caseId,
            assignments: { some: { lawyerProfileId: user.lawyerProfile?.id } }
          }
        : {
            id: caseId,
            clientProfileId: user.clientProfile?.id
          },
    include: {
      client: { include: { user: true } },
      documents: { orderBy: { createdAt: "desc" } },
      evidenceItems: { orderBy: { createdAt: "desc" } },
      timelineEvents: { orderBy: { eventDate: "asc" } },
      deadlines: { orderBy: { dueDate: "asc" } },
      drafts: { include: { versions: { orderBy: { versionNumber: "desc" } } }, orderBy: { updatedAt: "desc" } },
      comments: { include: { author: true }, orderBy: { createdAt: "desc" } },
      internalNotes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      assignments: { include: { lawyer: { include: { user: true } } } },
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
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export async function getDashboardSnapshot(role: "CLIENT" | "LAWYER") {
  const cases = await getCasesForRole(role);
  const caseIds = cases.map((item) => item.id);
  const deadlines = await prisma.deadline.findMany({
    where: { caseId: { in: caseIds } },
    orderBy: { dueDate: "asc" },
    take: 8
  });

  const timeline = await prisma.timelineEvent.findMany({
    where: { caseId: { in: caseIds } },
    orderBy: { eventDate: "desc" },
    take: 8
  });

  const metrics = [
    { label: "Case Health", value: average(cases.map((item) => item.caseHealthScore)), change: `${cases.length} matters` },
    { label: "Evidence Strength", value: average(cases.map((item) => item.evidenceStrength)), change: `${cases.reduce((sum, item) => sum + item.documents.length, 0)} files` },
    { label: "Draft Readiness", value: average(cases.map((item) => item.draftReadiness)), change: `${deadlines.filter((item) => item.status === "UPCOMING").length} upcoming deadlines` },
    { label: "Deadline Risk", value: average(cases.map((item) => item.deadlineRisk)), change: `${deadlines.filter((item) => item.status === "OVERDUE").length} overdue` }
  ];

  return {
    metrics,
    cases,
    timeline,
    deadlines
  };
}

export async function getNotifications() {
  const user = await getCurrentUserWithProfile();
  if (!user) return [];

  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });
}
