import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { handleApiError, unauthorized } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { searchLawyersForCase } from "@/lib/lawyer-search";
import { logEvent, withApiObservability } from "@/lib/observability";
import { buildAccessibleCaseWhereForUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const globalSearchSchema = z.object({
  q: z.string().optional().default(""),
  category: z
    .enum(["all", "cases", "documents", "evidence", "lawyers", "timeline", "deadlines", "drafts", "comments"])
    .optional()
    .default("all"),
  limit: z.coerce.number().int().min(3).max(20).optional().default(8)
});

const schema = z.object({
  query: z.string().optional().default(""),
  caseId: z.string().optional(),
  scope: z.enum(["ALL", "DOCUMENTS", "EVIDENCE"]).optional().default("ALL"),
  language: z.enum(["en", "ur", "roman-ur"]).optional()
});

const urduSearchMap: Record<string, string[]> = {
  "ادائیگی": ["payment", "paid", "amount", "receipt", "transaction"],
  "معاہدہ": ["contract", "agreement", "terms"],
  "نوٹس": ["notice", "legal notice"],
  "دھمکی": ["threat", "harassment", "warning"],
  "کرایہ": ["rent", "tenancy", "rental"],
  "ملازمت": ["employment", "job", "salary", "termination"],
  "تنخواہ": ["salary", "wage", "payment"],
  "ثبوت": ["evidence", "proof"],
  "شکایت": ["complaint", "grievance"],
  "وکیل": ["lawyer", "advocate"]
};

function getSearchTerms(query: string) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .slice(0, 8);
}

function expandSearchQuery(query: string) {
  const clean = query.trim();
  if (!clean) return [];

  const expanded = new Set<string>([clean]);
  for (const [urduTerm, englishTerms] of Object.entries(urduSearchMap)) {
    if (clean.includes(urduTerm)) {
      englishTerms.forEach((term) => expanded.add(term));
    }
  }

  return Array.from(expanded).slice(0, 10);
}

function containsInsensitive(term: string) {
  return { contains: term, mode: "insensitive" as const };
}

function normalizeText(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function makeSnippet(text: string, query: string, maxLength = 240) {
  const clean = normalizeText(text).replace(/\s+/g, " ").trim();

  if (!clean) return "";

  const q = query.toLowerCase().trim();
  const lower = clean.toLowerCase();

  if (!q) {
    return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
  }

  const index = lower.indexOf(q);

  if (index === -1) {
    return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
  }

  const start = Math.max(0, index - 80);
  const end = Math.min(clean.length, index + q.length + 160);

  const prefix = start > 0 ? "..." : "";
  const suffix = end < clean.length ? "..." : "";

  return `${prefix}${clean.slice(start, end)}${suffix}`;
}

function detectMatchedFields(item: Record<string, any>, query: string, fields: string[]) {
  const q = query.toLowerCase().trim();

  if (!q) return ["recent"];

  return fields.filter((field) => {
    const value = item[field];

    if (Array.isArray(value)) {
      return value.join(" ").toLowerCase().includes(q);
    }

    return normalizeText(value).toLowerCase().includes(q);
  });
}

function scoreResult(text: string, query: string, matchedFields: string[]) {
  const q = query.toLowerCase().trim();
  if (!q) return 1;

  const lower = text.toLowerCase();
  const occurrences = lower.split(q).length - 1;

  return Math.min(100, matchedFields.length * 18 + occurrences * 12);
}

const caseCategoryValues = [
  "CONTRACT_REVIEW",
  "RENTAL_TENANCY",
  "EMPLOYMENT",
  "CYBER_COMPLAINT",
  "HARASSMENT",
  "PAYMENT_DISPUTE",
  "BUSINESS_VENDOR",
  "LEGAL_NOTICE",
  "EVIDENCE_ORGANIZATION",
  "OTHER"
] as const;

const caseStatusValues = ["DRAFT", "INTAKE", "ACTIVE", "REVIEW", "ESCALATED", "CLOSED"] as const;
const priorityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const deadlineStatusValues = ["UPCOMING", "OVERDUE", "COMPLETED"] as const;

type GlobalCategory =
  | "cases"
  | "documents"
  | "evidence"
  | "lawyers"
  | "timeline"
  | "deadlines"
  | "drafts"
  | "comments";

function normalizeSearchValue(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}

function getEnumMatches<T extends string>(values: readonly T[], query: string, terms: string[]) {
  const needles = [query, ...terms].map((item) => item.trim().toLowerCase()).filter(Boolean);

  return values.filter((value) => {
    const normalized = normalizeSearchValue(value);
    return needles.some((needle) => normalized.includes(needle) || needle.includes(normalized));
  });
}

function shouldSearchCategory(active: string, category: GlobalCategory) {
  return active === "all" || active === category;
}

function caseHrefForRole(role: string, caseId: string) {
  return role === "LAWYER" ? `/lawyer/cases/${caseId}` : `/client/cases/${caseId}`;
}

function lawyerHrefForRole(role: string) {
  return role === "LAWYER" ? "/lawyers" : "/client/lawyers";
}

function createGlobalResult(input: {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  snippet?: string | null;
  href: string;
  caseId?: string | null;
  caseTitle?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  tags?: string[];
  matchedFields?: string[];
  score?: number;
}) {
  return {
    id: input.id,
    type: input.type,
    title: input.title,
    subtitle: input.subtitle || "",
    snippet: input.snippet || "",
    href: input.href,
    caseId: input.caseId || null,
    caseTitle: input.caseTitle || null,
    createdAt: input.createdAt || null,
    updatedAt: input.updatedAt || input.createdAt || null,
    tags: input.tags || [],
    matchedFields: input.matchedFields || [],
    score: input.score || 0
  };
}

export async function GET(request: Request) {
  return withApiObservability(request, { route: "/api/search", feature: "search.global" }, async () => {
    try {
      const user = await getCurrentUserWithProfile();

      if (!user) {
        return unauthorized();
      }

      const url = new URL(request.url);
      const params = globalSearchSchema.parse(Object.fromEntries(url.searchParams.entries()));
      const query = params.q.trim();
      const terms = getSearchTerms(query);
      const expandedQueries = expandSearchQuery(query);
      const allTerms = Array.from(new Set([...expandedQueries, ...terms])).filter(Boolean);

      if (query.length < 2) {
        return NextResponse.json({
          query,
          category: params.category,
          count: 0,
          totals: {
            cases: 0,
            documents: 0,
            evidence: 0,
            lawyers: 0,
            timeline: 0,
            deadlines: 0,
            drafts: 0,
            comments: 0
          },
          results: []
        });
      }

      const accessibleCaseWhere = buildAccessibleCaseWhereForUser(user);
      const caseCategoryMatches = getEnumMatches(caseCategoryValues, query, terms);
      const caseStatusMatches = getEnumMatches(caseStatusValues, query, terms);
      const priorityMatches = getEnumMatches(priorityValues, query, terms);
      const deadlineStatusMatches = getEnumMatches(deadlineStatusValues, query, terms);
      const tagTerms = Array.from(new Set([query, ...terms])).filter(Boolean);

      const caseSearchOr: Prisma.CaseWhereInput[] = [
        ...allTerms.flatMap((term) => [
          { title: containsInsensitive(term) },
          { description: containsInsensitive(term) },
          { stage: containsInsensitive(term) },
          { jurisdiction: containsInsensitive(term) }
        ]),
        ...(tagTerms.length ? [{ parties: { hasSome: tagTerms } }] : []),
        ...(caseCategoryMatches.length ? [{ category: { in: caseCategoryMatches as any } }] : []),
        ...(caseStatusMatches.length ? [{ status: { in: caseStatusMatches as any } }] : []),
        ...(priorityMatches.length ? [{ priority: { in: priorityMatches as any } }] : [])
      ];

      const documentSearchOr: Prisma.DocumentWhereInput[] = [
        ...allTerms.flatMap((term) => [
          { fileName: containsInsensitive(term) },
          { probableCategory: containsInsensitive(term) },
          { aiSummary: containsInsensitive(term) },
          { extractedText: containsInsensitive(term) }
        ]),
        ...(tagTerms.length ? [{ tags: { hasSome: tagTerms } }] : [])
      ];

      const evidenceSearchOr: Prisma.EvidenceItemWhereInput[] = allTerms.flatMap((term) => [
        { label: containsInsensitive(term) },
        { summary: containsInsensitive(term) },
        { searchableText: containsInsensitive(term) }
      ]);

      const timelineSearchOr: Prisma.TimelineEventWhereInput[] = allTerms.flatMap((term) => [
        { title: containsInsensitive(term) },
        { description: containsInsensitive(term) },
        { sourceLabel: containsInsensitive(term) }
      ]);

      const deadlineSearchOr: Prisma.DeadlineWhereInput[] = [
        ...allTerms.flatMap((term) => [{ title: containsInsensitive(term) }, { notes: containsInsensitive(term) }]),
        ...(deadlineStatusMatches.length ? [{ status: { in: deadlineStatusMatches as any } }] : [])
      ];

      const draftSearchOr: Prisma.DraftWhereInput[] = allTerms.flatMap((term) => [
        { title: containsInsensitive(term) },
        { currentContent: containsInsensitive(term) }
      ]);

      const commentSearchOr: Prisma.CommentWhereInput[] = allTerms.flatMap((term) => [
        { body: containsInsensitive(term) }
      ]);

      const [
        cases,
        documents,
        evidenceItems,
        timelineEvents,
        deadlines,
        drafts,
        comments,
        lawyerMatches
      ] = await Promise.all([
        shouldSearchCategory(params.category, "cases")
          ? prisma.case.findMany({
              where: {
                AND: [accessibleCaseWhere, { OR: caseSearchOr }]
              },
              select: {
                id: true,
                title: true,
                category: true,
                status: true,
                priority: true,
                stage: true,
                description: true,
                jurisdiction: true,
                updatedAt: true,
                _count: {
                  select: {
                    documents: true,
                    evidenceItems: true,
                    deadlines: true
                  }
                }
              },
              orderBy: { updatedAt: "desc" },
              take: params.limit
            })
          : Promise.resolve([]),
        shouldSearchCategory(params.category, "documents")
          ? prisma.document.findMany({
              where: {
                case: accessibleCaseWhere,
                OR: documentSearchOr
              },
              select: {
                id: true,
                caseId: true,
                fileName: true,
                mimeType: true,
                fileType: true,
                probableCategory: true,
                aiSummary: true,
                tags: true,
                confidence: true,
                createdAt: true,
                case: {
                  select: {
                    id: true,
                    title: true,
                    category: true
                  }
                }
              },
              orderBy: { createdAt: "desc" },
              take: params.limit
            })
          : Promise.resolve([]),
        shouldSearchCategory(params.category, "evidence")
          ? prisma.evidenceItem.findMany({
              where: {
                case: accessibleCaseWhere,
                OR: evidenceSearchOr
              },
              select: {
                id: true,
                caseId: true,
                documentId: true,
                label: true,
                summary: true,
                sourceType: true,
                searchableText: true,
                evidenceStrength: true,
                createdAt: true,
                case: {
                  select: {
                    id: true,
                    title: true,
                    category: true
                  }
                },
                document: {
                  select: {
                    id: true,
                    fileName: true
                  }
                }
              },
              orderBy: { createdAt: "desc" },
              take: params.limit
            })
          : Promise.resolve([]),
        shouldSearchCategory(params.category, "timeline")
          ? prisma.timelineEvent.findMany({
              where: {
                case: accessibleCaseWhere,
                OR: timelineSearchOr
              },
              select: {
                id: true,
                caseId: true,
                title: true,
                description: true,
                sourceLabel: true,
                eventDate: true,
                createdAt: true,
                case: {
                  select: {
                    id: true,
                    title: true,
                    category: true
                  }
                }
              },
              orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
              take: params.limit
            })
          : Promise.resolve([]),
        shouldSearchCategory(params.category, "deadlines")
          ? prisma.deadline.findMany({
              where: {
                case: accessibleCaseWhere,
                OR: deadlineSearchOr
              },
              select: {
                id: true,
                caseId: true,
                title: true,
                notes: true,
                status: true,
                importance: true,
                dueDate: true,
                createdAt: true,
                case: {
                  select: {
                    id: true,
                    title: true,
                    category: true
                  }
                }
              },
              orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
              take: params.limit
            })
          : Promise.resolve([]),
        shouldSearchCategory(params.category, "drafts")
          ? prisma.draft.findMany({
              where: {
                case: accessibleCaseWhere,
                OR: draftSearchOr
              },
              select: {
                id: true,
                caseId: true,
                type: true,
                title: true,
                verificationStatus: true,
                updatedAt: true,
                case: {
                  select: {
                    id: true,
                    title: true,
                    category: true
                  }
                }
              },
              orderBy: { updatedAt: "desc" },
              take: params.limit
            })
          : Promise.resolve([]),
        shouldSearchCategory(params.category, "comments")
          ? prisma.comment.findMany({
              where: {
                case: accessibleCaseWhere,
                ...(user.role === "CLIENT" ? { visibility: "SHARED" as const } : {}),
                OR: commentSearchOr
              },
              select: {
                id: true,
                caseId: true,
                body: true,
                visibility: true,
                createdAt: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                    role: true
                  }
                },
                case: {
                  select: {
                    id: true,
                    title: true,
                    category: true
                  }
                }
              },
              orderBy: { createdAt: "desc" },
              take: params.limit
            })
          : Promise.resolve([]),
        shouldSearchCategory(params.category, "lawyers")
          ? searchLawyersForCase({
              caseSummary: query,
              practiceArea: query,
              city: query,
              jurisdiction: query,
              preferredLanguage: query,
              limit: params.limit
            }).then((result) => result.matches)
          : Promise.resolve([])
      ]);

      const caseResults = cases.map((legalCase) => {
        const searchableText = [
          legalCase.title,
          legalCase.description,
          legalCase.stage,
          legalCase.jurisdiction,
          legalCase.category,
          legalCase.status,
          legalCase.priority
        ].join(" ");
        const matchedFields = detectMatchedFields(
          legalCase,
          query,
          ["title", "description", "stage", "jurisdiction", "category", "status", "priority"]
        );

        return createGlobalResult({
          id: legalCase.id,
          type: "CASE",
          title: legalCase.title,
          subtitle: `${normalizeSearchValue(legalCase.category)} - ${normalizeSearchValue(legalCase.status)}`,
          snippet: makeSnippet(legalCase.description || legalCase.stage, query, 180),
          href: caseHrefForRole(user.role, legalCase.id),
          caseId: legalCase.id,
          caseTitle: legalCase.title,
          updatedAt: legalCase.updatedAt,
          tags: [
            `${legalCase._count.documents} docs`,
            `${legalCase._count.evidenceItems} evidence`,
            `${legalCase._count.deadlines} deadlines`
          ],
          matchedFields,
          score: scoreResult(searchableText, query, matchedFields)
        });
      });

      const documentResults = documents.map((document) => {
        const searchableText = [
          document.fileName,
          document.probableCategory,
          document.aiSummary,
          document.mimeType,
          document.fileType,
          ...(document.tags || [])
        ].join(" ");
        const matchedFields = detectMatchedFields(
          document,
          query,
          ["fileName", "probableCategory", "aiSummary", "mimeType", "fileType", "tags"]
        );

        if (!matchedFields.length && query) matchedFields.push("document content");

        return createGlobalResult({
          id: document.id,
          type: "DOCUMENT",
          title: document.fileName,
          subtitle: `${document.case.title} - ${normalizeSearchValue(document.fileType)}`,
          snippet: makeSnippet(document.aiSummary || document.probableCategory || "Matched document metadata or extracted content.", query),
          href: caseHrefForRole(user.role, document.caseId),
          caseId: document.caseId,
          caseTitle: document.case.title,
          createdAt: document.createdAt,
          tags: [document.probableCategory, ...document.tags].filter(Boolean) as string[],
          matchedFields,
          score: scoreResult(searchableText, query, matchedFields)
        });
      });

      const evidenceResults = evidenceItems.map((evidence) => {
        const searchableText = [
          evidence.label,
          evidence.summary,
          evidence.searchableText,
          evidence.sourceType,
          evidence.document?.fileName
        ].join(" ");
        const matchedFields = detectMatchedFields(
          evidence,
          query,
          ["label", "summary", "searchableText", "sourceType"]
        );

        return createGlobalResult({
          id: evidence.id,
          type: "EVIDENCE",
          title: evidence.label,
          subtitle: `${evidence.case.title} - ${evidence.sourceType}`,
          snippet: makeSnippet(evidence.searchableText || evidence.summary || evidence.document?.fileName || "", query),
          href: caseHrefForRole(user.role, evidence.caseId),
          caseId: evidence.caseId,
          caseTitle: evidence.case.title,
          createdAt: evidence.createdAt,
          tags: [
            evidence.document?.fileName,
            typeof evidence.evidenceStrength === "number" ? `Strength ${evidence.evidenceStrength}%` : null
          ].filter(Boolean) as string[],
          matchedFields,
          score: scoreResult(searchableText, query, matchedFields)
        });
      });

      const timelineResults = timelineEvents.map((event) => {
        const searchableText = [event.title, event.description, event.sourceLabel].join(" ");
        const matchedFields = detectMatchedFields(event, query, ["title", "description", "sourceLabel"]);

        return createGlobalResult({
          id: event.id,
          type: "TIMELINE",
          title: event.title,
          subtitle: `${event.case.title} - timeline event`,
          snippet: makeSnippet(event.description || event.sourceLabel || "", query),
          href: caseHrefForRole(user.role, event.caseId),
          caseId: event.caseId,
          caseTitle: event.case.title,
          createdAt: event.eventDate,
          tags: event.sourceLabel ? [event.sourceLabel] : [],
          matchedFields,
          score: scoreResult(searchableText, query, matchedFields)
        });
      });

      const deadlineResults = deadlines.map((deadline) => {
        const searchableText = [deadline.title, deadline.notes, deadline.status, deadline.importance].join(" ");
        const matchedFields = detectMatchedFields(deadline, query, ["title", "notes", "status", "importance"]);

        return createGlobalResult({
          id: deadline.id,
          type: "DEADLINE",
          title: deadline.title,
          subtitle: `${deadline.case.title} - ${normalizeSearchValue(deadline.status)}`,
          snippet: makeSnippet(deadline.notes || `${deadline.importance} priority deadline`, query),
          href: caseHrefForRole(user.role, deadline.caseId),
          caseId: deadline.caseId,
          caseTitle: deadline.case.title,
          createdAt: deadline.dueDate,
          tags: [deadline.status, deadline.importance],
          matchedFields,
          score: scoreResult(searchableText, query, matchedFields)
        });
      });

      const draftResults = drafts.map((draft) => {
        const searchableText = [draft.title, draft.type, draft.verificationStatus].join(" ");
        const matchedFields = detectMatchedFields(draft, query, ["title", "type", "verificationStatus"]);

        if (!matchedFields.length && query) matchedFields.push("draft content");

        return createGlobalResult({
          id: draft.id,
          type: "DRAFT",
          title: draft.title,
          subtitle: `${draft.case.title} - ${normalizeSearchValue(draft.type)}`,
          snippet: `${normalizeSearchValue(draft.verificationStatus)} draft matched by title or content.`,
          href: caseHrefForRole(user.role, draft.caseId),
          caseId: draft.caseId,
          caseTitle: draft.case.title,
          updatedAt: draft.updatedAt,
          tags: [draft.type, draft.verificationStatus],
          matchedFields,
          score: scoreResult(searchableText, query, matchedFields)
        });
      });

      const commentResults = comments.map((comment) => {
        const searchableText = [comment.body, comment.author.name, comment.author.role].join(" ");
        const matchedFields = detectMatchedFields(comment, query, ["body"]);

        return createGlobalResult({
          id: comment.id,
          type: "COMMENT",
          title: `Comment by ${comment.author.name}`,
          subtitle: `${comment.case.title} - ${normalizeSearchValue(comment.visibility)}`,
          snippet: makeSnippet(comment.body, query),
          href: caseHrefForRole(user.role, comment.caseId),
          caseId: comment.caseId,
          caseTitle: comment.case.title,
          createdAt: comment.createdAt,
          tags: [comment.author.role, comment.visibility],
          matchedFields,
          score: scoreResult(searchableText, query, matchedFields)
        });
      });

      const lawyerResults = lawyerMatches.map((lawyer) =>
        createGlobalResult({
          id: lawyer.lawyerId,
          type: "LAWYER",
          title: lawyer.name,
          subtitle: [lawyer.firmName || "Independent practice", lawyer.city].filter(Boolean).join(" - "),
          snippet: lawyer.matchReasons.join(" "),
          href: lawyerHrefForRole(user.role),
          tags: [
            lawyer.verificationStatus,
            `${lawyer.yearsOfExperience} years`,
            lawyer.feeFrom ? `From PKR ${lawyer.feeFrom.toLocaleString()}` : null,
            ...lawyer.practiceAreas.slice(0, 3)
          ].filter(Boolean) as string[],
          matchedFields: lawyer.matchReasons,
          score: lawyer.matchScore
        })
      );

      const results = [
        ...caseResults,
        ...documentResults,
        ...evidenceResults,
        ...lawyerResults,
        ...timelineResults,
        ...deadlineResults,
        ...draftResults,
        ...commentResults
      ].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
      });

      const totals = {
        cases: caseResults.length,
        documents: documentResults.length,
        evidence: evidenceResults.length,
        lawyers: lawyerResults.length,
        timeline: timelineResults.length,
        deadlines: deadlineResults.length,
        drafts: draftResults.length,
        comments: commentResults.length
      };

      logEvent("info", "search.global_completed", {
        userId: user.id,
        role: user.role,
        category: params.category,
        resultCount: results.length,
        totals
      });

      return NextResponse.json({
        query,
        category: params.category,
        count: results.length,
        totals,
        results
      });
    } catch (error) {
      return handleApiError(error, "GLOBAL_SEARCH_ROUTE", "Search failed.");
    }
  });
}

export async function POST(request: Request) {
  return withApiObservability(request, { route: "/api/search", feature: "search" }, async () => {
    try {
      const user = await getCurrentUserWithProfile();

    if (!user) {
      return unauthorized();
    }

    const body = schema.parse(await request.json());
    const query = body.query.trim();
    const terms = getSearchTerms(query);
    const expandedQueries = expandSearchQuery(query);

    const accessibleCaseWhere = buildAccessibleCaseWhereForUser(user);

    const caseWhere: Prisma.CaseWhereInput =
      body.caseId && body.caseId !== "all"
        ? {
            AND: [
              accessibleCaseWhere,
              {
                id: body.caseId
              }
            ]
          }
        : accessibleCaseWhere;

    const documentSearchOr: Prisma.DocumentWhereInput[] = expandedQueries.length
      ? [
          ...expandedQueries.flatMap((term) => [
            { fileName: containsInsensitive(term) },
            { probableCategory: containsInsensitive(term) },
            { extractedText: containsInsensitive(term) },
            { aiSummary: containsInsensitive(term) }
          ]),
          ...(terms.length ? [{ tags: { hasSome: terms } }] : [])
        ]
      : [];

    const evidenceSearchOr: Prisma.EvidenceItemWhereInput[] = expandedQueries.length
      ? expandedQueries.flatMap((term) => [
          { label: containsInsensitive(term) },
          { summary: containsInsensitive(term) },
          { searchableText: containsInsensitive(term) }
        ])
      : [];

    const [documents, evidenceItems] = await Promise.all([
      body.scope === "EVIDENCE"
        ? Promise.resolve([])
        : prisma.document.findMany({
            where: {
              case: caseWhere,
              ...(query
                ? {
                    OR: documentSearchOr
                  }
                : {})
            },
            include: {
              case: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  status: true
                }
              }
            },
            orderBy: {
              createdAt: "desc"
            },
            take: query ? 30 : 12
          }),

      body.scope === "DOCUMENTS"
        ? Promise.resolve([])
        : prisma.evidenceItem.findMany({
            where: {
              case: caseWhere,
              ...(query
                ? {
                    OR: evidenceSearchOr
                  }
                : {})
            },
            include: {
              case: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  status: true
                }
              },
              document: {
                select: {
                  id: true,
                  fileName: true,
                  probableCategory: true
                }
              }
            },
            orderBy: {
              createdAt: "desc"
            },
            take: query ? 30 : 12
          })
    ]);

    const documentResults = documents.map((document) => {
      const searchableText = [
        document.fileName,
        document.probableCategory,
        document.aiSummary,
        document.extractedText,
        ...(document.tags || [])
      ].join(" ");

      const matchedFields = detectMatchedFields(
        document,
        query,
        ["fileName", "probableCategory", "aiSummary", "extractedText", "tags"]
      );

      const snippetSource =
        document.extractedText ||
        document.aiSummary ||
        document.probableCategory ||
        document.fileName;

      return {
        id: document.id,
        type: "DOCUMENT",
        title: document.fileName,
        caseId: document.caseId,
        caseTitle: document.case.title,
        caseCategory: document.case.category,
        category: document.probableCategory,
        createdAt: document.createdAt,
        tags: document.tags || [],
        matchedFields,
        snippet: makeSnippet(snippetSource || "", query),
        summary: document.aiSummary,
        confidence: document.confidence,
        score: scoreResult(searchableText, query, matchedFields)
      };
    });

    const evidenceResults = evidenceItems.map((evidence) => {
      const searchableText = [
        evidence.label,
        evidence.summary,
        evidence.searchableText,
        normalizeText(evidence.extractedEntities)
      ].join(" ");

      const matchedFields = detectMatchedFields(
        evidence,
        query,
        ["label", "summary", "searchableText", "extractedEntities"]
      );

      const snippetSource =
        evidence.searchableText ||
        evidence.summary ||
        evidence.label ||
        normalizeText(evidence.extractedEntities);

      return {
        id: evidence.id,
        type: "EVIDENCE",
        title: evidence.label,
        caseId: evidence.caseId,
        caseTitle: evidence.case.title,
        caseCategory: evidence.case.category,
        category: evidence.sourceType,
        createdAt: evidence.createdAt,
        tags: evidence.evidenceStrength ? [`Strength ${evidence.evidenceStrength}%`] : [],
        matchedFields,
        snippet: makeSnippet(snippetSource || "", query),
        summary: evidence.summary,
        linkedDocument: evidence.document,
        score: scoreResult(searchableText, query, matchedFields)
      };
    });

    const results = [...documentResults, ...evidenceResults].sort((a, b) => {
      if (query && b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

      logEvent("info", "search.completed", {
        userId: user.id,
        caseId: body.caseId || "all",
        scope: body.scope,
        resultCount: results.length,
        documentCount: documentResults.length,
        evidenceCount: evidenceResults.length
      });

      return NextResponse.json({
        query,
        count: results.length,
        results,
        totals: {
          documents: documentResults.length,
          evidence: evidenceResults.length
        }
      });
    } catch (error) {
      return handleApiError(error, "SEARCH_ROUTE", "Search failed.");
    }
  });
}
