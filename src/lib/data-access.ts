import { prisma } from "@/lib/prisma";
import { getCurrentUserWithProfile, getSession } from "@/lib/auth";
import { buildAccessibleCaseWhereForUser } from "@/lib/permissions";

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
    if (!user.lawyerProfile) return [];

    return prisma.case.findMany({
      where: {
        assignments: {
          some: {
            lawyerProfileId: user.lawyerProfile.id
          }
        }
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
        updatedAt: true,
        createdAt: true,
        _count: {
          select: {
            documents: true,
            deadlines: true,
            drafts: true,
            activityLogs: true
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 40
    });
  }

  if (!user.clientProfile) return [];

  return prisma.case.findMany({
    where: { clientProfileId: user.clientProfile.id },
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
      updatedAt: true,
      createdAt: true,
      _count: {
        select: {
          documents: true,
          deadlines: true,
          drafts: true,
          activityLogs: true
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 40
  });
}

export async function getCaseDetail(
  caseId?: string,
  currentUser?: NonNullable<Awaited<ReturnType<typeof getCurrentUserWithProfile>>>
) {
  if (!caseId) return null;
  const user = currentUser || (await getCurrentUserWithProfile());
  if (!user) return null;
  if (user.role === "LAWYER" && !user.lawyerProfile) return null;
  if (user.role === "CLIENT" && !user.clientProfile) return null;

  const where = buildAccessibleCaseWhereForUser(user, caseId);
  const includeInternalNotes = user.role === "LAWYER";

  const detail = await prisma.case.findFirst({
    where,
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
      contractFairness: true,
      draftReadiness: true,
      escalationReadiness: true,
      creatorId: true,
      clientProfileId: true,
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
        select: {
          id: true,
          caseId: true,
          lawyerProfileId: true,
          status: true,
          feeProposal: true,
          probability: true,
          proposalNotes: true,
          createdAt: true,
          updatedAt: true,
          lawyer: {
            select: {
              id: true,
              userId: true,
              firmName: true,
              city: true,
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
      deadlines: {
        select: {
          id: true,
          caseId: true,
          title: true,
          dueDate: true,
          notes: true,
          status: true,
          importance: true,
          isAiDetected: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { dueDate: "asc" },
        take: 50
      },
      drafts: {
        select: {
          id: true,
          caseId: true,
          createdById: true,
          verifiedById: true,
          type: true,
          title: true,
          currentContent: true,
          verificationStatus: true,
          createdAt: true,
          updatedAt: true,
          versions: {
            select: {
              id: true,
              draftId: true,
              versionNumber: true,
              changeSummary: true,
              createdAt: true
            },
            orderBy: { versionNumber: "desc" },
            take: 4
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 10
      },
      comments: {
        select: {
          id: true,
          caseId: true,
          authorId: true,
          documentId: true,
          body: true,
          visibility: true,
          pinned: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 30
      },
      internalNotes: includeInternalNotes
        ? {
            select: {
              id: true,
              caseId: true,
              authorId: true,
              body: true,
              createdAt: true,
              updatedAt: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            },
            orderBy: { createdAt: "desc" },
            take: 30
          }
        : false,
      agentActionReviews: {
        select: {
          id: true,
          createdById: true,
          caseId: true,
          documentId: true,
          tool: true,
          title: true,
          message: true,
          status: true,
          arguments: true,
          resultMessage: true,
          resultAction: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: "desc" },
        take: 30
      },
      exportBundles: {
        select: {
          id: true,
          caseId: true,
          bundleType: true,
          title: true,
          summary: true,
          filePath: true,
          includePrivateNotes: true,
          metadata: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" },
        take: 10
      },
      consultationBookings: {
        select: {
          id: true,
          caseId: true,
          clientProfileId: true,
          lawyerProfileId: true,
          assignmentId: true,
          requestedById: true,
          status: true,
          scheduledAt: true,
          durationMinutes: true,
          feeAmount: true,
          paymentStatus: true,
          paymentReference: true,
          meetingMode: true,
          meetingLink: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          lawyer: {
            select: {
              id: true,
              firmName: true,
              user: { select: { id: true, name: true, email: true } }
            }
          },
          client: {
            select: {
              id: true,
              user: { select: { id: true, name: true, email: true } }
            }
          },
          assignment: {
            select: {
              id: true,
              status: true,
              feeProposal: true,
              probability: true
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 20
      },
      riskScores: {
        select: {
          id: true,
          caseId: true,
          dimension: true,
          score: true,
          label: true,
          rationale: true,
          confidence: true,
          lastCalculatedAt: true
        }
      },
      assistantThreads: {
        select: {
          id: true,
          title: true,
          scope: true,
          caseId: true,
          documentId: true,
          createdAt: true,
          updatedAt: true,
          messages: {
            select: {
              id: true,
              role: true,
              content: true,
              confidence: true,
              sources: true,
              createdAt: true
            },
            orderBy: { createdAt: "desc" },
            take: 12
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      },
      debateSessions: {
        select: {
          id: true,
          caseId: true,
          lawyerId: true,
          title: true,
          status: true,
          startedAt: true,
          endsAt: true,
          outcomeProbability: true,
          outcomeLabel: true,
          evaluation: true,
          createdAt: true,
          updatedAt: true,
          turns: {
            select: {
              id: true,
              sessionId: true,
              speaker: true,
              content: true,
              roundNumber: true,
              createdAt: true
            },
            orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }],
            take: 40
          }
        },
        orderBy: { createdAt: "desc" },
        take: 5
      },
      _count: {
        select: {
          documents: true,
          evidenceItems: true,
          timelineEvents: true,
          deadlines: true,
          drafts: true,
          comments: true,
          internalNotes: true,
          activityLogs: true,
          assistantThreads: true,
          debateSessions: true
        }
      }
    }
  });

  if (!detail) return null;

  return {
    ...detail,
    documents: [],
    evidenceItems: [],
    timelineEvents: [],
    activityLogs: [],
    internalNotes: includeInternalNotes ? ((detail as any).internalNotes || []) : [],
    assistantThreads: sanitizeAssistantThreads(
      detail.assistantThreads.map((thread) => ({
        ...thread,
        messages: [...thread.messages].reverse()
      }))
    )
  };
}

export async function getCasePacketDetail(
  caseId: string,
  includeInternalNotes = false,
  currentUser?: NonNullable<Awaited<ReturnType<typeof getCurrentUserWithProfile>>>
) {
  const user = currentUser || (await getCurrentUserWithProfile());
  if (!user) return null;

  return prisma.case.findFirst({
    where: buildAccessibleCaseWhereForUser(user, caseId),
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      priority: true,
      stage: true,
      description: true,
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
          status: true,
          lawyer: {
            select: {
              id: true,
              firmName: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 20
      },
      documents: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          probableCategory: true,
          aiSummary: true,
          confidence: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" },
        take: 100
      },
      evidenceItems: {
        select: {
          id: true,
          label: true,
          summary: true,
          sourceType: true,
          evidenceStrength: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" },
        take: 100
      },
      timelineEvents: {
        select: {
          id: true,
          title: true,
          description: true,
          eventDate: true,
          sourceLabel: true,
          confidence: true
        },
        orderBy: { eventDate: "asc" },
        take: 100
      },
      deadlines: {
        select: {
          id: true,
          title: true,
          dueDate: true,
          notes: true,
          status: true,
          importance: true
        },
        orderBy: { dueDate: "asc" },
        take: 100
      },
      drafts: {
        select: {
          id: true,
          title: true,
          type: true,
          verificationStatus: true,
          updatedAt: true
        },
        orderBy: { updatedAt: "desc" },
        take: 50
      },
      internalNotes:
        user.role === "LAWYER" && includeInternalNotes
          ? {
              select: {
                id: true,
                body: true,
                createdAt: true
              },
              orderBy: { createdAt: "desc" },
              take: 50
            }
          : false
    }
  });
}

export function sanitizeAssistantThreads<
  T extends Array<{ messages: Array<{ role: string; content: string; confidence: number | null }> }>
>(threads: T): T {
  return threads.map((thread) => ({
    ...thread,
    messages: thread.messages.map((message) => {
      if (message.role !== "AI" || !containsInternalPromptText(message.content)) {
        return message;
      }

      return {
        ...message,
        content:
          "Previous assistant response was hidden because it contained internal prompt text. Please ask the question again to generate a fresh answer.",
        confidence: null
      };
    })
  })) as T;
}

function containsInternalPromptText(content: string) {
  const markers = [
    "You are MIZAN's Pakistani legal workflow assistant.",
    "You are LawSphere's Pakistani legal workflow assistant.",
    "You are assistive, careful, and structured like a professional Pakistani lawyer",
    "say you are trained on laws",
    "Pakistan-law context:",
    "Grounded case/document context:",
    "Grounded context preview: Case workspace context:",
    "User question:"
  ];

  const matchCount = markers.filter((marker) => content.includes(marker)).length;
  return matchCount >= 2;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export async function getDashboardSnapshot(role: "CLIENT" | "LAWYER") {
  const user = await getCurrentUserWithProfile();
  if (!user) {
    return {
      metrics: [],
      cases: [],
      timeline: [],
      deadlines: []
    };
  }

  const where =
    role === "LAWYER"
      ? user.lawyerProfile
        ? {
            assignments: {
              some: {
                lawyerProfileId: user.lawyerProfile.id
              }
            }
          }
        : { id: "__NO_ACCESS__" }
      : user.clientProfile
        ? { clientProfileId: user.clientProfile.id }
        : { id: "__NO_ACCESS__" };

  const cases = await prisma.case.findMany({
    where,
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
      updatedAt: true,
      createdAt: true,
      _count: {
        select: {
          documents: true,
          deadlines: true,
          drafts: true,
          activityLogs: true
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 20
  });

  const caseIds = cases.map((item) => item.id);
  const [deadlines, timeline] = caseIds.length
    ? await Promise.all([
        prisma.deadline.findMany({
          where: { caseId: { in: caseIds } },
          select: {
            id: true,
            caseId: true,
            title: true,
            dueDate: true,
            notes: true,
            status: true,
            importance: true
          },
          orderBy: { dueDate: "asc" },
          take: 8
        }),
        prisma.timelineEvent.findMany({
          where: { caseId: { in: caseIds } },
          select: {
            id: true,
            caseId: true,
            title: true,
            description: true,
            eventDate: true,
            confidence: true,
            sourceLabel: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { eventDate: "desc" },
          take: 8
        })
      ])
    : [[], []];

  const metrics = [
    { label: "Case Health", value: average(cases.map((item) => item.caseHealthScore)), change: `${cases.length} matters` },
    { label: "Evidence Strength", value: average(cases.map((item) => item.evidenceStrength)), change: `${cases.reduce((sum, item) => sum + item._count.documents, 0)} files` },
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
