import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function noAccessCaseWhere(): Prisma.CaseWhereInput {
  return { id: "__NO_ACCESS__" };
}

function getAccessibleCaseWhere(user: any): Prisma.CaseWhereInput {
  if (user.role === "LAWYER") {
    if (!user.lawyerProfile?.id) return noAccessCaseWhere();

    return {
      assignments: {
        some: {
          lawyerProfileId: user.lawyerProfile.id
        }
      }
    };
  }

  if (user.role === "CLIENT") {
    if (!user.clientProfile?.id) return noAccessCaseWhere();

    return {
      clientProfileId: user.clientProfile.id
    };
  }

  return {};
}

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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserWithProfile();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = schema.parse(await request.json());
    const query = body.query.trim();
    const terms = getSearchTerms(query);
    const expandedQueries = expandSearchQuery(query);

    const accessibleCaseWhere = getAccessibleCaseWhere(user);

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
    console.error("[SEARCH_ERROR]", error);

    return NextResponse.json(
      {
        error: "Search failed."
      },
      {
        status: 500
      }
    );
  }
}
