import { z } from "zod";
import type { DraftType, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CASE_CATEGORIES } from "@/lib/constants";
import { buildPakistanLawContext } from "@/lib/pakistan-law/retrieval";
import { buildCaseContext } from "@/lib/legal-ai";
import { runAiTask } from "@/lib/ai";
import { getLanguageInstruction, type AppLanguage } from "@/lib/language";
import {
  buildCourtReadyBundleMarkdown,
  buildLawyerHandoffMarkdown,
  writeMarkdownPacket
} from "@/lib/case-packets";
import {
  buildAccessibleCaseWhereForUser,
  type AppUser
} from "@/lib/permissions";
import { getRoadmapForCase } from "@/lib/case-roadmap";
import { getCasePacketDetail } from "@/lib/data-access";

export type AgentToolName =
  | "create_case"
  | "update_case"
  | "add_timeline_event"
  | "add_deadline"
  | "create_draft"
  | "suggest_evidence_checklist"
  | "create_evidence_gap_list"
  | "generate_case_roadmap"
  | "summarize_case"
  | "prepare_lawyer_handoff"
  | "recommend_lawyer_search_filters"
  | "create_template_document"
  | "create_lawyer_handoff_packet"
  | "create_court_ready_bundle"
  | "request_paid_consultation"
  | "summarize_assigned_case"
  | "create_internal_note"
  | "create_draft_review_note"
  | "prepare_case_brief"
  | "generate_cross_examination_questions"
  | "generate_opposition_arguments"
  | "prepare_debate_session_context"
  | "create_case_strategy_plan"
  | "search_user_cases"
  | "search_case_documents"
  | "search_evidence"
  | "explain_document"
  | "analyze_uploaded_evidence"
  | "prepare_meeting_prep"
  | "generate_case_health_report"
  | "translate_response"
  | "generate_next_steps";

export type AgentToolAction = {
  type: string;
  label: string;
  href?: string;
};

export type AgentToolResult = {
  ok: boolean;
  message: string;
  data?: Record<string, unknown>;
  action?: AgentToolAction;
  cardTitle?: string;
  cardMessage?: string;
  status?: "success" | "info" | "error";
  sources?: string[];
};

export type AgentToolContext = {
  currentUser: AppUser;
  question: string;
  language: AppLanguage;
  caseId?: string;
  documentId?: string;
  prisma: typeof prisma;
};

type AgentToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: AgentToolName;
  description: string;
  kind: "mutation" | "analysis" | "search";
  allowedRoles: Role[];
  schema: TSchema;
  execute: (context: AgentToolContext, args: z.infer<TSchema>) => Promise<AgentToolResult>;
};

type ResolvedCaseSummary = {
  id: string;
  title: string;
  category: (typeof CASE_CATEGORIES)[number];
  status: "DRAFT" | "INTAKE" | "ACTIVE" | "REVIEW" | "ESCALATED" | "CLOSED";
  stage: string;
};

type CaseResolution =
  | {
      legalCase: ResolvedCaseSummary;
    }
  | {
      error: string;
    };

type ResolvedDocumentSummary = {
  id: string;
  caseId: string;
  fileName: string;
  extractedText: string | null;
  aiSummary: string | null;
  probableCategory: string | null;
};

type DocumentResolution =
  | {
      document: ResolvedDocumentSummary;
    }
  | {
      error: string;
    };

const caseReferenceSchema = z.object({
  caseId: z.string().optional(),
  caseQuery: z.string().optional()
});

const documentReferenceSchema = z.object({
  documentId: z.string().optional(),
  documentQuery: z.string().optional()
});

const timelineItemSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  eventDate: z.string(),
  sourceLabel: z.string().optional(),
  confidence: z.number().min(0).max(1).optional()
});

const deadlineItemSchema = z.object({
  title: z.string().min(2),
  dueDate: z.string(),
  importance: z.string().optional(),
  notes: z.string().optional()
});

const createCaseSchema = z.object({
  title: z.string().optional(),
  category: z.string(),
  priority: z.string().optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  facts: z.array(z.string()).optional(),
  parties: z.array(z.string()).optional(),
  availableEvidence: z.array(z.string()).optional(),
  documentsMentioned: z.array(z.string()).optional(),
  evidenceGaps: z.array(z.string()).optional(),
  recommendedNextSteps: z.array(z.string()).optional(),
  lawyerReviewRecommended: z.boolean().optional(),
  timeline: z.array(timelineItemSchema).optional(),
  timelineEvents: z.array(timelineItemSchema).optional(),
  deadlines: z.array(deadlineItemSchema).optional()
});

const updateCaseSchema = caseReferenceSchema.extend({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  stage: z.string().optional(),
  status: z.enum(["DRAFT", "INTAKE", "ACTIVE", "REVIEW", "ESCALATED", "CLOSED"]).optional(),
  priority: z.string().optional()
});

const addDeadlineSchema = caseReferenceSchema.extend({
  title: z.string().min(2),
  dueDate: z.string(),
  importance: z.string().optional(),
  notes: z.string().optional()
});

const addTimelineEventSchema = caseReferenceSchema.extend({
  title: z.string().min(2),
  description: z.string().optional(),
  eventDate: z.string(),
  sourceLabel: z.string().optional(),
  confidence: z.number().min(0).max(1).optional()
});

const createDraftSchema = caseReferenceSchema.extend({
  title: z.string().optional(),
  draftType: z.string().optional(),
  purpose: z.string().optional(),
  extraInstructions: z.string().optional()
});

const searchSchema = z.object({
  query: z.string().min(2)
});

const caseSearchSchema = caseReferenceSchema.extend({
  query: z.string().min(2)
});

const explainDocumentSchema = caseReferenceSchema.merge(documentReferenceSchema).extend({
  question: z.string().optional()
});

const noteSchema = caseReferenceSchema.extend({
  body: z.string().min(2)
});

const caseArtifactSchema = caseReferenceSchema.extend({
  focus: z.string().optional()
});

const translateSchema = z.object({
  text: z.string().min(1),
  targetLanguage: z.enum(["en", "ur", "roman-ur"])
});

const templateDocumentSchema = caseReferenceSchema.extend({
  title: z.string().optional(),
  documentKind: z.string().optional(),
  extraInstructions: z.string().optional()
});

const bundleSchema = caseReferenceSchema.extend({
  includePrivateNotes: z.boolean().optional()
});

const consultationSchema = caseReferenceSchema.extend({
  assignmentId: z.string().optional(),
  lawyerProfileId: z.string().optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional()
});

const ROLE_TOOL_SET: Record<Role, AgentToolName[]> = {
  CLIENT: [
    "create_case",
    "update_case",
    "add_timeline_event",
    "add_deadline",
    "create_draft",
    "suggest_evidence_checklist",
    "create_evidence_gap_list",
    "generate_case_roadmap",
    "summarize_case",
    "prepare_lawyer_handoff",
    "recommend_lawyer_search_filters",
    "create_template_document",
    "create_lawyer_handoff_packet",
    "create_court_ready_bundle",
    "request_paid_consultation",
    "search_user_cases",
    "search_case_documents",
    "search_evidence",
    "explain_document",
    "analyze_uploaded_evidence",
    "prepare_meeting_prep",
    "generate_case_health_report",
    "translate_response",
    "generate_next_steps"
  ],
  LAWYER: [
    "update_case",
    "add_timeline_event",
    "add_deadline",
    "create_draft",
    "summarize_assigned_case",
    "create_internal_note",
    "create_draft_review_note",
    "prepare_case_brief",
    "create_lawyer_handoff_packet",
    "create_court_ready_bundle",
    "request_paid_consultation",
    "generate_cross_examination_questions",
    "generate_opposition_arguments",
    "prepare_debate_session_context",
    "create_case_strategy_plan",
    "search_user_cases",
    "search_case_documents",
    "search_evidence",
    "explain_document",
    "analyze_uploaded_evidence",
    "prepare_meeting_prep",
    "generate_case_health_report",
    "translate_response",
    "generate_next_steps"
  ],
  ADMIN: [
    "search_user_cases",
    "search_case_documents",
    "search_evidence",
    "explain_document",
    "analyze_uploaded_evidence",
    "prepare_meeting_prep",
    "generate_case_health_report",
    "translate_response",
    "generate_next_steps"
  ]
};

function cleanList(values: string[] | undefined) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function normalizePriority(value: string | undefined) {
  const normalized = (value || "").trim().toUpperCase();

  if (normalized === "LOW" || normalized === "MEDIUM" || normalized === "HIGH" || normalized === "CRITICAL") {
    return normalized;
  }

  const lower = normalized.toLowerCase();
  if (lower.includes("urgent") || lower.includes("critical")) return "CRITICAL";
  if (lower.includes("high")) return "HIGH";
  if (lower.includes("low")) return "LOW";
  if (lower.includes("medium") || lower.includes("normal")) return "MEDIUM";
  return null;
}

function normalizeCaseCategory(value: string | undefined) {
  const normalized = (value || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (CASE_CATEGORIES.includes(normalized as (typeof CASE_CATEGORIES)[number])) {
    return normalized as (typeof CASE_CATEGORIES)[number];
  }

  const lower = (value || "").trim().toLowerCase();

  if (lower.includes("payment") || lower.includes("vendor") || lower.includes("delivery")) {
    return "PAYMENT_DISPUTE";
  }
  if (lower.includes("contract") || lower.includes("agreement")) {
    return "CONTRACT_REVIEW";
  }
  if (lower.includes("rent") || lower.includes("tenant") || lower.includes("landlord")) {
    return "RENTAL_TENANCY";
  }
  if (lower.includes("employment") || lower.includes("salary") || lower.includes("termination")) {
    return "EMPLOYMENT";
  }
  if (lower.includes("cyber") || lower.includes("online") || lower.includes("digital") || lower.includes("scam")) {
    return "CYBER_COMPLAINT";
  }
  if (lower.includes("harass")) {
    return "HARASSMENT";
  }
  if (lower.includes("notice")) {
    return "LEGAL_NOTICE";
  }
  if (lower.includes("evidence")) {
    return "EVIDENCE_ORGANIZATION";
  }
  if (lower.includes("business")) {
    return "BUSINESS_VENDOR";
  }

  return "OTHER";
}

function normalizeDraftType(value: string | undefined): DraftType {
  const normalized = (value || "").trim().toUpperCase().replace(/\s+/g, "_");
  const allowed: DraftType[] = [
    "COMPLAINT_LETTER",
    "LEGAL_NOTICE",
    "WARNING_LETTER",
    "RESPONSE_LETTER",
    "REFUND_REQUEST",
    "GRIEVANCE_SUBMISSION",
    "CONTRACT_REVISION",
    "OPINION_BRIEF",
    "OTHER"
  ];

  if (allowed.includes(normalized as DraftType)) {
    return normalized as DraftType;
  }

  const lower = (value || "").trim().toLowerCase();
  if (lower.includes("notice")) return "LEGAL_NOTICE";
  if (lower.includes("refund")) return "REFUND_REQUEST";
  if (lower.includes("warning")) return "WARNING_LETTER";
  if (lower.includes("complaint")) return "COMPLAINT_LETTER";
  if (lower.includes("grievance")) return "GRIEVANCE_SUBMISSION";
  if (lower.includes("contract")) return "CONTRACT_REVISION";
  if (lower.includes("opinion") || lower.includes("brief") || lower.includes("handoff")) return "OPINION_BRIEF";
  return "OTHER";
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatListSection(title: string, values: string[]) {
  if (!values.length) return "";
  return `${title}:\n${values.map((value) => `- ${value}`).join("\n")}`;
}

function makeCaseDescription(input: {
  summary?: string;
  description?: string;
  facts: string[];
  parties: string[];
  availableEvidence: string[];
  documentsMentioned: string[];
  evidenceGaps: string[];
  recommendedNextSteps: string[];
  lawyerReviewRecommended?: boolean;
}) {
  return [
    input.summary || input.description || "",
    input.description && input.description !== input.summary ? input.description : "",
    formatListSection("Key facts", input.facts),
    formatListSection("Parties mentioned", input.parties),
    formatListSection("Available evidence", [...input.availableEvidence, ...input.documentsMentioned]),
    formatListSection("Evidence gaps", input.evidenceGaps),
    formatListSection("Recommended next steps", input.recommendedNextSteps),
    input.lawyerReviewRecommended ? "Lawyer review is recommended for this matter." : ""
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

async function resolveCaseReference(
  currentUser: AppUser,
  options: { caseId?: string; caseQuery?: string }
): Promise<CaseResolution> {
  if (options.caseId) {
    const legalCase = await prisma.case.findFirst({
      where: buildAccessibleCaseWhereForUser(currentUser, options.caseId),
      select: { id: true, title: true, category: true, status: true, stage: true }
    });

    if (!legalCase) {
      return { error: "I could not find that case in your accessible matters." as const };
    }

    return { legalCase };
  }

  const caseQuery = options.caseQuery?.trim();
  if (!caseQuery) {
    return { error: "Please select a case first or mention its title." as const };
  }

  const matches = await prisma.case.findMany({
    where: {
      AND: [
        buildAccessibleCaseWhereForUser(currentUser),
        {
          OR: [
            { title: { contains: caseQuery, mode: "insensitive" } },
            { description: { contains: caseQuery, mode: "insensitive" } }
          ]
        }
      ]
    },
    select: { id: true, title: true, category: true, status: true, stage: true },
    take: 5,
    orderBy: { updatedAt: "desc" }
  });

  if (!matches.length) {
    return { error: "I could not match that request to one of your cases." as const };
  }

  if (matches.length > 1) {
    return {
      error: `I found multiple matching cases: ${matches.map((item) => item.title).join(", ")}. Please select the case first or name it more precisely.` as const
    };
  }

  return { legalCase: matches[0] };
}

async function resolveDocumentReference(
  currentUser: AppUser,
  options: { caseId?: string; caseQuery?: string; documentId?: string; documentQuery?: string }
): Promise<DocumentResolution> {
  if (options.documentId) {
    const document = await prisma.document.findFirst({
      where: {
        id: options.documentId,
        case: buildAccessibleCaseWhereForUser(currentUser, options.caseId)
      },
      select: {
        id: true,
        caseId: true,
        fileName: true,
        extractedText: true,
        aiSummary: true,
        probableCategory: true
      }
    });

    if (!document) {
      return { error: "I could not find that document in your accessible records." as const };
    }

    return { document };
  }

  const documentQuery = options.documentQuery?.trim();
  if (!documentQuery) {
    return { error: "Please name the document you want me to explain." as const };
  }

  const caseResolution =
    options.caseId || options.caseQuery
      ? await resolveCaseReference(currentUser, { caseId: options.caseId, caseQuery: options.caseQuery })
      : null;

  if (caseResolution && "error" in caseResolution) {
    return { error: caseResolution.error };
  }

  const documents = await prisma.document.findMany({
    where: {
      case: caseResolution?.legalCase
        ? buildAccessibleCaseWhereForUser(currentUser, caseResolution.legalCase.id)
        : buildAccessibleCaseWhereForUser(currentUser),
      OR: [
        { fileName: { contains: documentQuery, mode: "insensitive" } },
        { aiSummary: { contains: documentQuery, mode: "insensitive" } },
        { extractedText: { contains: documentQuery, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      caseId: true,
      fileName: true,
      extractedText: true,
      aiSummary: true,
      probableCategory: true
    },
    take: 5,
    orderBy: { createdAt: "desc" }
  });

  if (!documents.length) {
    return { error: "I could not find a matching document." as const };
  }

  if (documents.length > 1) {
    return {
      error: `I found multiple matching documents: ${documents.map((item) => item.fileName).join(", ")}. Please be more specific.` as const
    };
  }

  return { document: documents[0] };
}

async function buildArtifactFromCase(options: {
  currentUser: AppUser;
  language: AppLanguage;
  caseId: string;
  question: string;
  heading: string;
  instruction: string;
  maxOutputTokens?: number;
}) {
  const built = await buildCaseContext(options.caseId);
  const context = built?.text || "No case context found.";
  const law = buildPakistanLawContext(`${options.question}\n${context}`);

  const result = await runAiTask(
    [
      "You are MIZAN's Pakistani legal workflow assistant.",
      getLanguageInstruction(options.language),
      `Task: ${options.heading}`,
      options.instruction,
      "Return Markdown only.",
      "Use concise headings and bullet points where helpful.",
      "Bold important dates, money amounts, deadlines, documents, and actions with **bold**.",
      "Do not wrap the answer in a code block.",
      `Pakistan-law context:\n${law.context}`,
      `Grounded case context:\n${context}`
    ].join("\n\n"),
    options.question,
    { maxOutputTokens: options.maxOutputTokens ?? 1800, temperature: 0.2 }
  );

  return {
    markdown: result.text,
    sources: Array.from(
      new Set([
        ...(built?.legalCase.documents.slice(0, 4).map((item) => item.fileName) || []),
        ...law.matches.map((item) => item.title)
      ])
    ).slice(0, 8)
  };
}

async function buildArtifactFromDocument(options: {
  language: AppLanguage;
  document: {
    id: string;
    fileName: string;
    extractedText: string | null;
    aiSummary: string | null;
    probableCategory: string | null;
  };
  question: string;
  instruction: string;
}) {
  const documentContext = [
    `Document name: ${options.document.fileName}`,
    `Probable category: ${options.document.probableCategory || "n/a"}`,
    options.document.aiSummary ? `Summary:\n${options.document.aiSummary}` : "",
    options.document.extractedText ? `Extracted text:\n${options.document.extractedText.slice(0, 6000)}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const law = buildPakistanLawContext(`${options.question}\n${documentContext}`);
  const result = await runAiTask(
    [
      "You are MIZAN's Pakistani legal workflow assistant.",
      getLanguageInstruction(options.language),
      options.instruction,
      "Return Markdown only. Use concise headings and bullet points where helpful.",
      "Bold important dates, money amounts, deadlines, and actions with **bold**.",
      "Do not wrap the answer in a code block.",
      `Pakistan-law context:\n${law.context}`,
      `Grounded document context:\n${documentContext}`
    ].join("\n\n"),
    options.question,
    { maxOutputTokens: 1600, temperature: 0.2 }
  );

  return {
    markdown: result.text,
    sources: [options.document.fileName, ...law.matches.map((item) => item.title)].slice(0, 8)
  };
}

async function createDraftRecord(input: {
  currentUser: AppUser;
  caseId: string;
  title: string;
  type: DraftType;
  content: string;
  changeSummary: string;
}) {
  const latest = await prisma.draft.findFirst({
    where: { caseId: input.caseId, title: input.title },
    orderBy: { updatedAt: "desc" }
  });

  if (latest) {
    const draft = await prisma.draft.update({
      where: { id: latest.id },
      data: {
        type: input.type,
        currentContent: input.content,
        verificationStatus: "UNREVIEWED"
      }
    });
    const versionCount = await prisma.draftVersion.count({ where: { draftId: latest.id } });
    await prisma.draftVersion.create({
      data: {
        draftId: latest.id,
        createdById: input.currentUser.id,
        versionNumber: versionCount + 1,
        changeSummary: input.changeSummary,
        content: input.content
      }
    });
    return draft;
  }

  return prisma.draft.create({
    data: {
      caseId: input.caseId,
      createdById: input.currentUser.id,
      type: input.type,
      title: input.title,
      currentContent: input.content,
      verificationStatus: "UNREVIEWED",
      versions: {
        create: {
          createdById: input.currentUser.id,
          versionNumber: 1,
          changeSummary: input.changeSummary,
          content: input.content
        }
      }
    }
  });
}

const toolDefinitions: AgentToolDefinition[] = [
  {
    name: "create_case",
    description:
      "Create a new client-owned case from a natural-language story, plus roadmap entries, optional timeline events, optional deadlines, and evidence notes.",
    kind: "mutation",
    allowedRoles: ["CLIENT"],
    schema: createCaseSchema,
    async execute({ currentUser, question }, args) {
      if (currentUser.role !== "CLIENT" || !currentUser.clientProfile) {
        return {
          ok: false,
          message:
            "This action is available for clients. As a lawyer, I can prepare a case brief or internal strategy for an assigned matter.",
          status: "info"
        };
      }

      const category = normalizeCaseCategory(args.category);
      const priority = normalizePriority(args.priority) || "MEDIUM";
      const facts = cleanList(args.facts);
      const parties = cleanList(args.parties);
      const availableEvidence = cleanList(args.availableEvidence);
      const documentsMentioned = cleanList(args.documentsMentioned);
      const evidenceGaps = cleanList(args.evidenceGaps);
      const recommendedNextSteps = cleanList(args.recommendedNextSteps);
      const timelineEntries = [...(args.timeline || []), ...(args.timelineEvents || [])];
      const validTimelineEntries = timelineEntries
        .map((entry: z.infer<typeof timelineItemSchema>) => ({
          ...entry,
          parsedEventDate: parseDate(entry.eventDate)
        }))
        .filter((entry) => entry.parsedEventDate);
      const validDeadlines = (args.deadlines || [])
        .map((deadline: z.infer<typeof deadlineItemSchema>) => ({
          ...deadline,
          parsedDueDate: parseDate(deadline.dueDate),
          importance: normalizePriority(deadline.importance) || "HIGH"
        }))
        .filter(
          (deadline: z.infer<typeof deadlineItemSchema> & { parsedDueDate: Date | null; importance: string }) =>
            deadline.parsedDueDate
        );

      const title =
        args.title?.trim() ||
        args.summary?.trim() ||
        facts[0]?.slice(0, 72) ||
        `New ${category.toLowerCase().replace(/_/g, " ")} matter`;
      const description = makeCaseDescription({
        summary: args.summary,
        description: args.description,
        facts,
        parties,
        availableEvidence,
        documentsMentioned,
        evidenceGaps,
        recommendedNextSteps,
        lawyerReviewRecommended: args.lawyerReviewRecommended
      });

      const roadmap = getRoadmapForCase(category, new Date());
      const now = new Date();
      const legalCase = await prisma.case.create({
        data: {
          title,
          category,
          priority,
          description,
          creatorId: currentUser.id,
          clientProfileId: currentUser.clientProfile.id,
          status: "INTAKE",
          stage: "AI intake organized",
          caseHealthScore: 18,
          evidenceCompleteness: Math.min(100, availableEvidence.length * 16),
          evidenceStrength: Math.min(100, availableEvidence.length * 14),
          draftReadiness: recommendedNextSteps.length ? 22 : 8,
          deadlineRisk: validDeadlines.length ? 18 : 4,
          escalationReadiness: args.lawyerReviewRecommended ? 36 : 16,
          timelineEvents: {
            create: [
              {
                title: "Case opened by AI intake",
                description: "A new matter was created from the client's narrated facts.",
                eventDate: now,
                confidence: 1,
                sourceLabel: "system",
                isAiGenerated: false
              },
              ...roadmap.map((item) => ({
                title: item.title,
                description: item.description,
                eventDate: item.eventDate,
                confidence: item.confidence,
                sourceLabel: item.sourceLabel,
                isAiGenerated: true
              })),
              ...validTimelineEntries.map((item) => ({
                title: item.title,
                description: item.description,
                eventDate: item.parsedEventDate!,
                confidence: item.confidence ?? 0.82,
                sourceLabel: item.sourceLabel || "user-provided",
                isAiGenerated: true
              })),
              ...recommendedNextSteps.slice(0, 4).map((step, index) => {
                const eventDate = new Date(now);
                eventDate.setDate(now.getDate() + index);
                return {
                  title: `Recommended next step: ${step}`,
                  description: "Generated during AI intake from the user's request.",
                  eventDate,
                  confidence: 0.78,
                  sourceLabel: "agent-roadmap",
                  isAiGenerated: true
                };
              })
            ]
          },
          deadlines: validDeadlines.length
            ? {
                create: validDeadlines.map((deadline: (z.infer<typeof deadlineItemSchema> & {
                  parsedDueDate: Date | null;
                  importance: string;
                })) => ({
                  title: deadline.title,
                  dueDate: deadline.parsedDueDate!,
                  notes: deadline.notes,
                  importance: deadline.importance as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
                  isAiDetected: true
                }))
              }
            : undefined,
          evidenceItems:
            availableEvidence.length || documentsMentioned.length
              ? {
                  create: [...availableEvidence, ...documentsMentioned].slice(0, 6).map((item: string) => ({
                    label: item,
                    summary: "Captured from the client's narrated intake.",
                    sourceType: "user-provided",
                    searchableText: item,
                    evidenceStrength: 45
                  }))
                }
              : undefined
        },
        select: { id: true, title: true, category: true }
      });

      await prisma.activityLog.create({
        data: {
          caseId: legalCase.id,
          actorId: currentUser.id,
          action: "AI_CASE_CREATED",
          detail: `AI intake created case ${legalCase.title}.`,
          metadata: {
            evidenceGaps,
            recommendedNextSteps,
            question
          }
        }
      });

      return {
        ok: true,
        message: [
          `## Intake Completed`,
          `I created a new case called **${legalCase.title}** and organized the initial matter record.`,
          evidenceGaps.length
            ? `### Evidence Gaps\n${evidenceGaps.map((item) => `- ${item}`).join("\n")}`
            : "",
          recommendedNextSteps.length
            ? `### Recommended Next Steps\n${recommendedNextSteps.map((item) => `- ${item}`).join("\n")}`
            : "",
          validDeadlines.length
            ? `### Suggested Deadlines\n${validDeadlines
                .map(
                  (item: z.infer<typeof deadlineItemSchema> & { parsedDueDate: Date | null; importance: string }) =>
                    `- ${item.title} on **${item.dueDate}**`
                )
                .join("\n")}`
            : ""
        ]
          .filter(Boolean)
          .join("\n\n"),
        cardTitle: "Case created",
        cardMessage: `The new matter **${legalCase.title}** is ready in your workspace.`,
        action: {
          type: "open_case",
          label: "Open case",
          href: `/client/cases/${legalCase.id}`
        },
        status: "success",
        data: { caseId: legalCase.id, title: legalCase.title, category: legalCase.category }
      };
    }
  },
  {
    name: "update_case",
    description: "Update safe case fields such as title, description, stage, status, or priority for an accessible matter.",
    kind: "mutation",
    allowedRoles: ["CLIENT", "LAWYER"],
    schema: updateCaseSchema,
    async execute({ currentUser }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) {
        return { ok: false, message: resolved.error, status: "info" };
      }

      const data: Prisma.CaseUpdateInput = {
        title: args.title,
        description: args.description,
        stage: args.stage,
        status: args.status,
        priority: normalizePriority(args.priority) || undefined
      };

      const updated = await prisma.case.update({
        where: { id: resolved.legalCase.id },
        data,
        select: { id: true, title: true, status: true, stage: true, priority: true }
      });

      await prisma.activityLog.create({
        data: {
          caseId: updated.id,
          actorId: currentUser.id,
          action: "AI_CASE_UPDATED",
          detail: "AI updated case fields.",
            metadata: {
              title: args.title ?? null,
              description: args.description ?? null,
              stage: args.stage ?? null,
              status: args.status ?? null,
              priority: normalizePriority(args.priority)
            }
          }
        });

      return {
        ok: true,
        message: `## Case Updated\nI updated **${updated.title}** with the new case details you requested.`,
        cardTitle: "Case updated",
        cardMessage: `Changes were saved to **${updated.title}**.`,
        action: {
          type: "open_case",
          label: "Open case",
          href: `/${currentUser.role === "LAWYER" ? "lawyer" : "client"}/cases/${updated.id}`
        },
        status: "success",
        data: { caseId: updated.id }
      };
    }
  },
  {
    name: "add_deadline",
    description: "Add a deadline to an accessible case and log it on the matter timeline.",
    kind: "mutation",
    allowedRoles: ["CLIENT", "LAWYER"],
    schema: addDeadlineSchema,
    async execute({ currentUser }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) {
        return { ok: false, message: resolved.error, status: "info" };
      }

      const dueDate = parseDate(args.dueDate);
      if (!dueDate) {
        return { ok: false, message: "I need a valid deadline date before I can add it.", status: "info" };
      }

      const importance = normalizePriority(args.importance) || "MEDIUM";
      const deadline = await prisma.deadline.create({
        data: {
          caseId: resolved.legalCase.id,
          title: args.title,
          dueDate,
          notes: args.notes,
          importance: importance as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          isAiDetected: false
        },
        select: { id: true, title: true }
      });

      await prisma.timelineEvent.create({
        data: {
          caseId: resolved.legalCase.id,
          title: `Deadline added: ${args.title}`,
          description: args.notes || "Added by the MIZAN AI assistant.",
          eventDate: dueDate,
          confidence: 1,
          sourceLabel: "agent-roadmap",
          isAiGenerated: false
        }
      });

      await prisma.activityLog.create({
        data: {
          caseId: resolved.legalCase.id,
          actorId: currentUser.id,
          action: "AI_DEADLINE_ADDED",
          detail: `AI added deadline ${args.title}.`
        }
      });

      return {
        ok: true,
        message: `## Deadline Added\nI added **${deadline.title}** to **${resolved.legalCase.title}**.`,
        cardTitle: "Deadline added",
        cardMessage: `The new deadline is now attached to **${resolved.legalCase.title}**.`,
        action: {
          type: "open_case",
          label: "Open case",
          href: `/${currentUser.role === "LAWYER" ? "lawyer" : "client"}/cases/${resolved.legalCase.id}`
        },
        status: "success",
        data: { caseId: resolved.legalCase.id, deadlineId: deadline.id }
      };
    }
  },
  {
    name: "add_timeline_event",
    description: "Add a dated timeline event to an accessible case.",
    kind: "mutation",
    allowedRoles: ["CLIENT", "LAWYER"],
    schema: addTimelineEventSchema,
    async execute({ currentUser }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) {
        return { ok: false, message: resolved.error, status: "info" };
      }

      const eventDate = parseDate(args.eventDate);
      if (!eventDate) {
        return { ok: false, message: "I need a valid event date before I can add it.", status: "info" };
      }

      const event = await prisma.timelineEvent.create({
        data: {
          caseId: resolved.legalCase.id,
          title: args.title,
          description: args.description,
          eventDate,
          confidence: args.confidence ?? 0.92,
          sourceLabel: args.sourceLabel || "user-provided",
          isAiGenerated: false
        },
        select: { id: true, title: true }
      });

      await prisma.activityLog.create({
        data: {
          caseId: resolved.legalCase.id,
          actorId: currentUser.id,
          action: "AI_TIMELINE_EVENT_ADDED",
          detail: `AI added timeline event ${args.title}.`
        }
      });

      return {
        ok: true,
        message: `## Timeline Updated\nI added **${event.title}** to the timeline for **${resolved.legalCase.title}**.`,
        cardTitle: "Timeline updated",
        cardMessage: `The case timeline now includes **${event.title}**.`,
        action: {
          type: "open_case",
          label: "Open case",
          href: `/${currentUser.role === "LAWYER" ? "lawyer" : "client"}/cases/${resolved.legalCase.id}`
        },
        status: "success",
        data: { caseId: resolved.legalCase.id, timelineEventId: event.id }
      };
    }
  },
  {
    name: "create_draft",
    description: "Generate or refresh an editable case draft such as a legal notice, refund request, warning letter, complaint letter, or handoff brief.",
    kind: "mutation",
    allowedRoles: ["CLIENT", "LAWYER"],
    schema: createDraftSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) {
        return { ok: false, message: resolved.error, status: "info" };
      }

      const draftType = normalizeDraftType(args.draftType || args.purpose);
      const draftTitle =
        args.title?.trim() ||
        draftType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: draftTitle,
        instruction: [
          `Prepare a lawyer-editable **${draftTitle}** for this case.`,
          "Use only the record and do not invent facts.",
          "Preserve placeholders where the case record is incomplete.",
          args.extraInstructions ? `Extra instructions: ${args.extraInstructions}` : ""
        ]
          .filter(Boolean)
          .join("\n")
      });

      const draft = await createDraftRecord({
        currentUser,
        caseId: resolved.legalCase.id,
        title: draftTitle,
        type: draftType,
        content: artifact.markdown,
        changeSummary: "Generated by MIZAN AI agent"
      });

      await prisma.activityLog.create({
        data: {
          caseId: resolved.legalCase.id,
          actorId: currentUser.id,
          action: "AI_DRAFT_GENERATED",
          detail: `AI generated draft ${draftTitle}.`,
          metadata: { draftId: draft.id, draftType }
        }
      });

      return {
        ok: true,
        message: `## Draft Ready\nI created an editable **${draftTitle}** for **${resolved.legalCase.title}**.`,
        cardTitle: "Draft created",
        cardMessage: `The draft is saved in the case workspace and ready for review.`,
        action: {
          type: "open_case",
          label: "Open draft in case",
          href: `/${currentUser.role === "LAWYER" ? "lawyer" : "client"}/cases/${resolved.legalCase.id}`
        },
        status: "success",
        data: { caseId: resolved.legalCase.id, draftId: draft.id, draftTitle },
        sources: artifact.sources
      };
    }
  },
  {
    name: "create_template_document",
    description: "Create a ready editable document template using the current draft system when the user asks for a notice, complaint, warning letter, grievance, or handoff format.",
    kind: "mutation",
    allowedRoles: ["CLIENT", "LAWYER"],
    schema: templateDocumentSchema,
    async execute(context, args) {
      return toolMap.create_draft.execute(context, {
        caseId: args.caseId,
        caseQuery: args.caseQuery,
        title: args.title || args.documentKind || "Editable legal template",
        draftType: args.documentKind || "OTHER",
        purpose: args.documentKind || "template",
        extraInstructions: [
          "Make this especially template-like and easy to edit.",
          args.extraInstructions || ""
        ]
          .filter(Boolean)
          .join(" ")
      });
    }
  },
  {
    name: "create_internal_note",
    description: "Create a lawyer-only internal note on an assigned matter.",
    kind: "mutation",
    allowedRoles: ["LAWYER"],
    schema: noteSchema,
    async execute({ currentUser }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) {
        return { ok: false, message: resolved.error, status: "info" };
      }

      const note = await prisma.internalNote.create({
        data: {
          caseId: resolved.legalCase.id,
          authorId: currentUser.id,
          body: args.body
        },
        select: { id: true }
      });

      await prisma.activityLog.create({
        data: {
          caseId: resolved.legalCase.id,
          actorId: currentUser.id,
          action: "AI_INTERNAL_NOTE_ADDED",
          detail: "AI created an internal note."
        }
      });

      return {
        ok: true,
        message: `## Internal Note Saved\nI added the internal note to **${resolved.legalCase.title}**.`,
        cardTitle: "Internal note saved",
        cardMessage: "The note is visible only on the lawyer side of the case.",
        action: {
          type: "open_case",
          label: "Open case",
          href: `/lawyer/cases/${resolved.legalCase.id}`
        },
        status: "success",
        data: { caseId: resolved.legalCase.id, noteId: note.id }
      };
    }
  },
  {
    name: "create_draft_review_note",
    description: "Create a lawyer-only review note about drafting posture, edits, or verification concerns for an assigned case.",
    kind: "mutation",
    allowedRoles: ["LAWYER"],
    schema: noteSchema,
    async execute(context, args) {
      return toolMap.create_internal_note.execute(context, {
        ...args,
        body: `Draft review note:\n\n${args.body}`
      });
    }
  },
  {
    name: "search_user_cases",
    description: "Search accessible cases by title, description, category, or stage.",
    kind: "search",
    allowedRoles: ["CLIENT", "LAWYER", "ADMIN"],
    schema: searchSchema,
    async execute({ currentUser }, args) {
      const matches = await prisma.case.findMany({
        where: {
          AND: [
            buildAccessibleCaseWhereForUser(currentUser),
            {
              OR: [
                { title: { contains: args.query, mode: "insensitive" } },
                { description: { contains: args.query, mode: "insensitive" } },
                { stage: { contains: args.query, mode: "insensitive" } }
              ]
            }
          ]
        },
        select: { id: true, title: true, category: true, status: true, stage: true },
        take: 5,
        orderBy: { updatedAt: "desc" }
      });

      if (!matches.length) {
        return { ok: true, message: "## Search Results\nI could not find a matching case yet.", status: "info" };
      }

      return {
        ok: true,
        message: [
          "## Matching Cases",
          ...matches.map(
            (item) =>
              `- **${item.title}** — ${item.category}, ${item.status}, ${item.stage}`
          )
        ].join("\n"),
        action: {
          type: "open_case",
          label: "Open first match",
          href: `/${currentUser.role === "LAWYER" ? "lawyer" : "client"}/cases/${matches[0].id}`
        },
        cardTitle: "Matching cases found",
        cardMessage: `I found ${matches.length} accessible case${matches.length === 1 ? "" : "s"} that match your request.`,
        status: "info",
        data: { matches }
      };
    }
  },
  {
    name: "search_case_documents",
    description: "Search accessible case documents by filename, summary, extracted text, or probable category.",
    kind: "search",
    allowedRoles: ["CLIENT", "LAWYER", "ADMIN"],
    schema: caseSearchSchema,
    async execute({ currentUser }, args) {
      const resolved =
        args.caseId || args.caseQuery
          ? await resolveCaseReference(currentUser, args)
          : null;

      if (resolved && "error" in resolved) {
        return { ok: false, message: resolved.error, status: "info" };
      }

      const documents = await prisma.document.findMany({
        where: {
          case: resolved?.legalCase
            ? buildAccessibleCaseWhereForUser(currentUser, resolved.legalCase.id)
            : buildAccessibleCaseWhereForUser(currentUser),
          OR: [
            { fileName: { contains: args.query, mode: "insensitive" } },
            { aiSummary: { contains: args.query, mode: "insensitive" } },
            { extractedText: { contains: args.query, mode: "insensitive" } },
            { probableCategory: { contains: args.query, mode: "insensitive" } }
          ]
        },
        select: {
          id: true,
          fileName: true,
          caseId: true,
          aiSummary: true
        },
        take: 5,
        orderBy: { createdAt: "desc" }
      });

      if (!documents.length) {
        return { ok: true, message: "## Document Search\nI could not find a matching document.", status: "info" };
      }

      return {
        ok: true,
        message: [
          "## Matching Documents",
          ...documents.map(
            (item) =>
              `- **${item.fileName}**${item.aiSummary ? ` — ${item.aiSummary.slice(0, 140)}...` : ""}`
          )
        ].join("\n"),
        cardTitle: "Matching documents found",
        cardMessage: `I found ${documents.length} document${documents.length === 1 ? "" : "s"} that match your search.`,
        status: "info",
        data: { documents }
      };
    }
  },
  {
    name: "search_evidence",
    description: "Search accessible evidence entries by label, summary, or searchable extracted text.",
    kind: "search",
    allowedRoles: ["CLIENT", "LAWYER", "ADMIN"],
    schema: caseSearchSchema,
    async execute({ currentUser }, args) {
      const resolved =
        args.caseId || args.caseQuery
          ? await resolveCaseReference(currentUser, args)
          : null;

      if (resolved && "error" in resolved) {
        return { ok: false, message: resolved.error, status: "info" };
      }

      const items = await prisma.evidenceItem.findMany({
        where: {
          case: resolved?.legalCase
            ? buildAccessibleCaseWhereForUser(currentUser, resolved.legalCase.id)
            : buildAccessibleCaseWhereForUser(currentUser),
          OR: [
            { label: { contains: args.query, mode: "insensitive" } },
            { summary: { contains: args.query, mode: "insensitive" } },
            { searchableText: { contains: args.query, mode: "insensitive" } }
          ]
        },
        select: { id: true, label: true, summary: true, caseId: true },
        take: 5,
        orderBy: { createdAt: "desc" }
      });

      if (!items.length) {
        return { ok: true, message: "## Evidence Search\nI could not find matching evidence yet.", status: "info" };
      }

      return {
        ok: true,
        message: [
          "## Matching Evidence",
          ...items.map((item) => `- **${item.label}**${item.summary ? ` — ${item.summary}` : ""}`)
        ].join("\n"),
        cardTitle: "Matching evidence found",
        cardMessage: `I found ${items.length} evidence item${items.length === 1 ? "" : "s"} matching your request.`,
        status: "info",
        data: { items }
      };
    }
  },
  {
    name: "explain_document",
    description: "Explain an accessible document or screenshot using grounded document context.",
    kind: "analysis",
    allowedRoles: ["CLIENT", "LAWYER", "ADMIN"],
    schema: explainDocumentSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveDocumentReference(currentUser, args);
      if ("error" in resolved) {
        return { ok: false, message: resolved.error, status: "info" };
      }

      const artifact = await buildArtifactFromDocument({
        language,
        document: resolved.document,
        question: args.question || question,
        instruction:
          "Explain what this document says, what it is useful for, what risk signals appear in it, and what practical next steps follow."
      });

      return {
        ok: true,
        message: artifact.markdown,
        status: "info",
        sources: artifact.sources,
        data: { documentId: resolved.document.id, caseId: resolved.document.caseId }
      };
    }
  },
  {
    name: "analyze_uploaded_evidence",
    description:
      "Run evidence intake on an accessible uploaded document or screenshot: classify it, extract grounded entities, link it to possible timeline facts, and list evidence gaps.",
    kind: "analysis",
    allowedRoles: ["CLIENT", "LAWYER", "ADMIN"],
    schema: explainDocumentSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveDocumentReference(currentUser, args);
      if ("error" in resolved) {
        return { ok: false, message: resolved.error, status: "info" };
      }

      const artifact = await buildArtifactFromDocument({
        language,
        document: resolved.document,
        question: args.question || question,
        instruction: [
          "Perform an evidence intake review for this uploaded item.",
          "Only use grounded text from the document context. Do not invent parties, dates, amounts, offences, promises, or contradictions.",
          "Include these sections: Evidence type, Extracted parties, Dates and amounts, Promises or obligations, Possible contradictions, Timeline facts this may support, Missing evidence, What to upload next.",
          "If the document text is unreadable or insufficient, say that clearly and ask for a clearer upload or manual summary."
        ].join("\n")
      });

      return {
        ok: true,
        message: artifact.markdown,
        cardTitle: "Evidence intake ready",
        cardMessage: `I reviewed **${resolved.document.fileName}** as evidence and listed the grounded facts and gaps.`,
        status: "info",
        sources: artifact.sources,
        data: { documentId: resolved.document.id, caseId: resolved.document.caseId }
      };
    }
  },
  {
    name: "translate_response",
    description: "Translate supplied assistant content into English, Urdu, or Roman Urdu without changing the meaning.",
    kind: "analysis",
    allowedRoles: ["CLIENT", "LAWYER", "ADMIN"],
    schema: translateSchema,
    async execute(_context, args) {
      const instruction = getLanguageInstruction(args.targetLanguage);
      const result = await runAiTask(
        [
          "Translate the supplied MIZAN assistant content into the target language.",
          instruction,
          "Return only the translated content in Markdown.",
          "Do not add new facts or legal advice.",
          "Do not wrap the answer in a code block."
        ].join("\n\n"),
        args.text,
        { maxOutputTokens: 4096, temperature: 0.1 }
      );

      return {
        ok: true,
        message: result.text,
        status: "info"
      };
    }
  },
  {
    name: "prepare_meeting_prep",
    description:
      "Prepare hearing, meeting, or lawyer-consultation prep from an accessible case: questions, documents to carry, weak points, and likely counterarguments.",
    kind: "analysis",
    allowedRoles: ["CLIENT", "LAWYER", "ADMIN"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };

      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Hearing and meeting prep",
        instruction:
          "Prepare a practical prep sheet with questions to ask, facts to clarify, documents to carry, weak points, likely counterarguments, and what should be reviewed by a lawyer. Do not invent facts."
      });

      return {
        ok: true,
        message: artifact.markdown,
        cardTitle: "Meeting prep ready",
        cardMessage: `I prepared a focused meeting and hearing prep sheet for **${resolved.legalCase.title}**.`,
        action: {
          type: "open_case",
          label: "Open case",
          href: `/${currentUser.role === "LAWYER" ? "lawyer" : "client"}/cases/${resolved.legalCase.id}`
        },
        status: "info",
        sources: artifact.sources
      };
    }
  },
  {
    name: "generate_case_health_report",
    description:
      "Generate a practical readiness score for an accessible case: evidence strength, timeline completeness, missing party details, draft readiness, and lawyer handoff readiness.",
    kind: "analysis",
    allowedRoles: ["CLIENT", "LAWYER", "ADMIN"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };

      const snapshot = await prisma.case.findFirst({
        where: buildAccessibleCaseWhereForUser(currentUser, resolved.legalCase.id),
        select: {
          title: true,
          caseHealthScore: true,
          evidenceCompleteness: true,
          evidenceStrength: true,
          deadlineRisk: true,
          draftReadiness: true,
          escalationReadiness: true,
          _count: {
            select: {
              documents: true,
              evidenceItems: true,
              timelineEvents: true,
              deadlines: true,
              drafts: true
            }
          }
        }
      });

      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question: [
          question,
          snapshot
            ? `Current score snapshot: health ${snapshot.caseHealthScore}, evidence completeness ${snapshot.evidenceCompleteness}, evidence strength ${snapshot.evidenceStrength}, deadline risk ${snapshot.deadlineRisk}, draft readiness ${snapshot.draftReadiness}, lawyer handoff readiness ${snapshot.escalationReadiness}. Counts: ${snapshot._count.documents} documents, ${snapshot._count.evidenceItems} evidence items, ${snapshot._count.timelineEvents} timeline events, ${snapshot._count.deadlines} deadlines, ${snapshot._count.drafts} drafts.`
            : ""
        ]
          .filter(Boolean)
          .join("\n\n"),
        heading: "Case health score",
        instruction:
          "Create a practical case readiness report. Include evidence strength, timeline completeness, missing party details, draft readiness, lawyer handoff readiness, risk level, and the next 3 improvements. Treat numeric scores as internal signals, not legal certainty."
      });

      return {
        ok: true,
        message: artifact.markdown,
        cardTitle: "Case health report ready",
        cardMessage: `I prepared a readiness score and improvement plan for **${resolved.legalCase.title}**.`,
        action: {
          type: "open_case",
          label: "Open case",
          href: `/${currentUser.role === "LAWYER" ? "lawyer" : "client"}/cases/${resolved.legalCase.id}`
        },
        status: "info",
        sources: artifact.sources
      };
    }
  },
  {
    name: "summarize_case",
    description: "Summarize an accessible client case with position, evidence, gaps, and next steps.",
    kind: "analysis",
    allowedRoles: ["CLIENT"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Case summary",
        instruction:
          "Summarize the case for the client with headings for position, evidence already available, missing evidence, immediate next steps, and caution."
      });
      return { ok: true, message: artifact.markdown, status: "info", sources: artifact.sources };
    }
  },
  {
    name: "summarize_assigned_case",
    description: "Summarize an assigned case from the lawyer perspective.",
    kind: "analysis",
    allowedRoles: ["LAWYER"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Assigned case summary",
        instruction:
          "Summarize the case for a lawyer with litigation posture, proof strengths, missing links, procedural risk, and practical next steps."
      });
      return { ok: true, message: artifact.markdown, status: "info", sources: artifact.sources };
    }
  },
  {
    name: "suggest_evidence_checklist",
    description: "Generate a practical evidence checklist for the current matter.",
    kind: "analysis",
    allowedRoles: ["CLIENT"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Evidence checklist",
        instruction:
          "Create a practical evidence checklist for the client. Separate must-have proof, useful supporting proof, and items that should be preserved quickly."
      });
      return { ok: true, message: artifact.markdown, status: "info", sources: artifact.sources };
    }
  },
  {
    name: "create_evidence_gap_list",
    description: "List missing evidence and explain why each gap matters.",
    kind: "analysis",
    allowedRoles: ["CLIENT"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Evidence gap list",
        instruction:
          "List the missing evidence, why each gap matters legally or practically, and how the client could fill the gap."
      });
      return { ok: true, message: artifact.markdown, status: "info", sources: artifact.sources };
    }
  },
  {
    name: "generate_case_roadmap",
    description: "Create roadmap timeline steps for an accessible case and persist them as timeline events.",
    kind: "mutation",
    allowedRoles: ["CLIENT", "LAWYER"],
    schema: caseArtifactSchema,
    async execute({ currentUser }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };

      const legalCase = await prisma.case.findUnique({
        where: { id: resolved.legalCase.id },
        select: { id: true, title: true, category: true }
      });
      if (!legalCase) {
        return { ok: false, message: "I could not find that case right now.", status: "error" };
      }

      const existingCount = await prisma.timelineEvent.count({
        where: { caseId: legalCase.id, sourceLabel: "agent-roadmap" }
      });
      if (!existingCount) {
        await prisma.timelineEvent.createMany({
          data: getRoadmapForCase(legalCase.category, new Date()).map((item) => ({
            caseId: legalCase.id,
            title: item.title,
            description: item.description,
            eventDate: item.eventDate,
            confidence: item.confidence,
            sourceLabel: "agent-roadmap",
            isAiGenerated: true
          }))
        });
      }

      await prisma.activityLog.create({
        data: {
          caseId: legalCase.id,
          actorId: currentUser.id,
          action: "AI_ROADMAP_CREATED",
          detail: "AI created roadmap entries."
        }
      });

      return {
        ok: true,
        message: `## Roadmap Created\nI added roadmap steps to **${legalCase.title}** so the case has an organized next-step path.`,
        cardTitle: "Roadmap created",
        cardMessage: "New roadmap entries are now visible on the case timeline.",
        action: {
          type: "open_case",
          label: "Open case",
          href: `/${currentUser.role === "LAWYER" ? "lawyer" : "client"}/cases/${legalCase.id}`
        },
        status: "success",
        data: { caseId: legalCase.id }
      };
    }
  },
  {
    name: "create_lawyer_handoff_packet",
    description:
      "Create and save a structured lawyer handoff packet for an accessible case with summary, evidence index, chronology, deadlines, drafts, and lawyer review questions.",
    kind: "mutation",
    allowedRoles: ["CLIENT", "LAWYER"],
    schema: bundleSchema,
    async execute({ currentUser }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };

      const legalCase = await getCasePacketDetail(resolved.legalCase.id, false, currentUser);
      if (!legalCase) return { ok: false, message: "I could not find that case right now.", status: "error" };

      const markdown = buildLawyerHandoffMarkdown(legalCase);
      const packet = await writeMarkdownPacket({
        caseId: legalCase.id,
        title: legalCase.title,
        kind: "lawyer-handoff",
        markdown
      });

      const bundle = await prisma.exportBundle.create({
        data: {
          caseId: legalCase.id,
          createdById: currentUser.id,
          bundleType: "lawyer_handoff_packet",
          title: `Lawyer handoff - ${legalCase.title}`,
          summary: "Structured case summary, evidence index, chronology, deadlines, and lawyer review questions.",
          filePath: packet.publicPath,
          includePrivateNotes: false,
          metadata: {
            format: "markdown",
            documentCount: legalCase.documents.length,
            timelineCount: legalCase.timelineEvents.length,
            deadlineCount: legalCase.deadlines.length
          }
        }
      });

      await prisma.activityLog.create({
        data: {
          caseId: legalCase.id,
          actorId: currentUser.id,
          action: "LAWYER_HANDOFF_CREATED",
          detail: "Created a lawyer handoff packet from the assistant."
        }
      });

      return {
        ok: true,
        message: `## Lawyer Handoff Packet Created\nI created a lawyer handoff packet for **${legalCase.title}** and saved it in this case workspace.`,
        cardTitle: "Lawyer handoff created",
        cardMessage: "The handoff packet is ready to open from the workspace.",
        action: {
          type: "open_export",
          label: "Open packet",
          href: bundle.filePath
        },
        status: "success",
        data: { bundleId: bundle.id, filePath: bundle.filePath }
      };
    }
  },
  {
    name: "create_court_ready_bundle",
    description:
      "Create and save a court-ready workspace bundle with cover sheet, chronology, annexure index, deadlines, draft list, and readiness checklist.",
    kind: "mutation",
    allowedRoles: ["CLIENT", "LAWYER"],
    schema: bundleSchema,
    async execute({ currentUser }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };

      const includePrivateNotes = currentUser.role === "LAWYER" ? Boolean(args.includePrivateNotes) : false;
      const legalCase = await getCasePacketDetail(resolved.legalCase.id, includePrivateNotes, currentUser);
      if (!legalCase) return { ok: false, message: "I could not find that case right now.", status: "error" };

      const markdown = buildCourtReadyBundleMarkdown(legalCase, includePrivateNotes);
      const packet = await writeMarkdownPacket({
        caseId: legalCase.id,
        title: legalCase.title,
        kind: "court-ready-bundle",
        markdown
      });

      const bundle = await prisma.exportBundle.create({
        data: {
          caseId: legalCase.id,
          createdById: currentUser.id,
          bundleType: "court_ready_bundle",
          title: `Court-ready bundle - ${legalCase.title}`,
          summary: "Chronology, annexure index, deadlines, drafts, and readiness checklist.",
          filePath: packet.publicPath,
          includePrivateNotes,
          metadata: {
            format: "markdown",
            documentCount: legalCase.documents.length,
            timelineCount: legalCase.timelineEvents.length,
            deadlineCount: legalCase.deadlines.length
          }
        }
      });

      await prisma.activityLog.create({
        data: {
          caseId: legalCase.id,
          actorId: currentUser.id,
          action: "COURT_BUNDLE_CREATED",
          detail: "Created a court-ready bundle from the assistant."
        }
      });

      return {
        ok: true,
        message: `## Court Bundle Created\nI created a court-ready organizer for **${legalCase.title}** and saved it in this case workspace.`,
        cardTitle: "Court bundle created",
        cardMessage: "The court-ready organizer is ready to open from the workspace.",
        action: {
          type: "open_export",
          label: "Open bundle",
          href: bundle.filePath
        },
        status: "success",
        data: { bundleId: bundle.id, filePath: bundle.filePath }
      };
    }
  },
  {
    name: "request_paid_consultation",
    description:
      "Create a consultation request or lawyer proposal connected to an accessible case and existing lawyer assignment.",
    kind: "mutation",
    allowedRoles: ["CLIENT", "LAWYER"],
    schema: consultationSchema,
    async execute({ currentUser }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };

      const legalCase = await prisma.case.findFirst({
        where: buildAccessibleCaseWhereForUser(currentUser, resolved.legalCase.id),
        select: {
          id: true,
          title: true,
          clientProfileId: true,
          client: {
            select: {
              userId: true,
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
              lawyer: {
                select: {
                  id: true,
                  userId: true,
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
            take: 50
          }
        }
      });
      if (!legalCase) return { ok: false, message: "I could not find that case right now.", status: "error" };

      const scheduledAt = parseDate(args.scheduledAt) || undefined;

      if (currentUser.role === "CLIENT") {
        if (!currentUser.clientProfile) {
          return { ok: false, message: "This action is available only to client accounts.", status: "error" };
        }

        let assignment = args.assignmentId
          ? legalCase.assignments.find((item) => item.id === args.assignmentId)
          : null;

        if (!assignment && args.lawyerProfileId) {
          assignment = legalCase.assignments.find((item) => item.lawyerProfileId === args.lawyerProfileId) || null;
        }

        if (!assignment && legalCase.assignments.length === 1) {
          assignment = legalCase.assignments[0];
        }

        if (!assignment) {
          return {
            ok: false,
            message: "Please select one lawyer in the workspace first, then I can request the consultation.",
            status: "info"
          };
        }

        const consultation = await prisma.consultationBooking.create({
          data: {
            caseId: legalCase.id,
            clientProfileId: currentUser.clientProfile.id,
            lawyerProfileId: assignment.lawyerProfileId,
            assignmentId: assignment.id,
            requestedById: currentUser.id,
            status: "REQUESTED",
            scheduledAt,
            notes: args.notes,
            durationMinutes: 30,
            meetingMode: "ONLINE"
          }
        });

        await prisma.activityLog.create({
          data: {
            caseId: legalCase.id,
            actorId: currentUser.id,
            action: "CONSULTATION_REQUESTED",
            detail: "Requested a paid consultation from the assistant."
          }
        });

        await prisma.notification.create({
          data: {
            userId: assignment.lawyer.userId,
            title: "Consultation requested",
            body: `${legalCase.client.user.name} requested a consultation for ${legalCase.title}.`,
            kind: "consultation",
            link: `/lawyer/cases/${legalCase.id}`
          }
        });

        return {
          ok: true,
          message: `## Consultation Requested\nI sent a consultation request for **${legalCase.title}** to **${assignment.lawyer.user.name}**.`,
          cardTitle: "Consultation requested",
          cardMessage: "The lawyer can now propose terms or confirm the slot.",
          action: {
            type: "open_case",
            label: "Open case",
            href: `/client/cases/${legalCase.id}`
          },
          status: "success",
          data: { consultationId: consultation.id }
        };
      }

      if (currentUser.role !== "LAWYER" || !currentUser.lawyerProfile) {
        return { ok: false, message: "This action is not available from this account.", status: "error" };
      }

      const assignment = legalCase.assignments.find(
        (item) => item.lawyerProfileId === currentUser.lawyerProfile?.id
      );
      if (!assignment) {
        return { ok: false, message: "You can only propose consultations for assigned matters.", status: "error" };
      }

      const consultation = await prisma.consultationBooking.create({
        data: {
          caseId: legalCase.id,
          clientProfileId: legalCase.clientProfileId,
          lawyerProfileId: currentUser.lawyerProfile.id,
          assignmentId: assignment.id,
          requestedById: currentUser.id,
          status: "PROPOSED",
          scheduledAt,
          notes: args.notes,
          durationMinutes: 30,
          meetingMode: "ONLINE"
        }
      });

      await prisma.activityLog.create({
        data: {
          caseId: legalCase.id,
          actorId: currentUser.id,
          action: "CONSULTATION_PROPOSED",
          detail: "Proposed a paid consultation from the assistant."
        }
      });

      await prisma.notification.create({
        data: {
          userId: legalCase.client.userId,
          title: "Consultation proposed",
          body: `${currentUser.name} proposed a consultation for ${legalCase.title}.`,
          kind: "consultation",
          link: `/client/cases/${legalCase.id}`
        }
      });

      return {
        ok: true,
        message: `## Consultation Proposed\nI created a consultation proposal for **${legalCase.title}**.`,
        cardTitle: "Consultation proposed",
        cardMessage: "The client can review and confirm it from the workspace.",
        action: {
          type: "open_case",
          label: "Open case",
          href: `/lawyer/cases/${legalCase.id}`
        },
        status: "success",
        data: { consultationId: consultation.id }
      };
    }
  },
  {
    name: "generate_next_steps",
    description: "Generate immediate practical next steps for an accessible case or current legal question.",
    kind: "analysis",
    allowedRoles: ["CLIENT", "LAWYER", "ADMIN"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved =
        args.caseId || args.caseQuery
          ? await resolveCaseReference(currentUser, args)
          : null;

      if (resolved && "error" in resolved) {
        return { ok: false, message: resolved.error, status: "info" };
      }

      if (resolved?.legalCase) {
        const artifact = await buildArtifactFromCase({
          currentUser,
          language,
          caseId: resolved.legalCase.id,
          question,
          heading: "Next steps",
          instruction:
            "Produce a short practical next-step roadmap with immediate action, evidence work, drafting path, and lawyer-escalation triggers."
        });
        return { ok: true, message: artifact.markdown, status: "info", sources: artifact.sources };
      }

      const law = buildPakistanLawContext(question);
      const result = await runAiTask(
        [
          "You are MIZAN's Pakistani legal workflow assistant.",
          getLanguageInstruction(language),
          "Give immediate practical next steps for the user's legal problem.",
          "Return Markdown only with short headings and bullet points.",
          "Do not wrap the answer in a code block.",
          `Pakistan-law context:\n${law.context}`
        ].join("\n\n"),
        question,
        { maxOutputTokens: 1200, temperature: 0.2 }
      );
      return { ok: true, message: result.text, status: "info", sources: law.matches.map((item) => item.title).slice(0, 8) };
    }
  },
  {
    name: "prepare_lawyer_handoff",
    description: "Prepare a structured lawyer handoff brief for an accessible client case.",
    kind: "analysis",
    allowedRoles: ["CLIENT"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Lawyer handoff brief",
        instruction:
          "Prepare a concise handoff brief for a lawyer with matter summary, strongest facts, available evidence, missing proof, deadlines, risks, and what review is needed."
      });
      return {
        ok: true,
        message: artifact.markdown,
        cardTitle: "Lawyer handoff ready",
        cardMessage: `The handoff brief for **${resolved.legalCase.title}** is ready to review.`,
        action: {
          type: "open_case",
          label: "Open case",
          href: `/client/cases/${resolved.legalCase.id}`
        },
        status: "info",
        sources: artifact.sources
      };
    }
  },
  {
    name: "recommend_lawyer_search_filters",
    description: "Recommend practical lawyer search filters based on the current case type and workflow needs.",
    kind: "analysis",
    allowedRoles: ["CLIENT"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved =
        args.caseId || args.caseQuery
          ? await resolveCaseReference(currentUser, args)
          : null;

      if (resolved && "error" in resolved) return { ok: false, message: resolved.error, status: "info" };

      const publicLawyers = await prisma.lawyerProfile.findMany({
        where: { isPublic: true },
        select: {
          id: true,
          specialties: true,
          city: true,
          verifiedBadge: true,
          rating: true,
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: [{ verifiedBadge: "desc" }, { rating: "desc" }],
        take: 10
      });

      const context = [
        resolved?.legalCase ? `Case: ${resolved.legalCase.title} (${resolved.legalCase.category})` : "",
        "Public lawyer directory snapshot:",
        ...publicLawyers.map(
          (lawyer) =>
            `- ${lawyer.user.name}; specialties: ${lawyer.specialties.join(", ") || "n/a"}; city: ${lawyer.city || "n/a"}; verified: ${lawyer.verifiedBadge ? "yes" : "no"}`
        )
      ]
        .filter(Boolean)
        .join("\n");

      const result = await runAiTask(
        [
          "You are MIZAN's workflow assistant helping a client narrow lawyer search filters.",
          getLanguageInstruction(language),
          "Recommend search filters, priorities, and what to compare between lawyers.",
          "Do not invent licences, outcomes, or fees.",
          "Return Markdown only.",
          "Use headings and bullet points."
        ].join("\n\n"),
        `${question}\n\n${context}`,
        { maxOutputTokens: 1200, temperature: 0.2 }
      );

      return {
        ok: true,
        message: result.text,
        action: {
          type: "open_lawyers",
          label: "Browse lawyers",
          href: "/client/lawyers"
        },
        cardTitle: "Lawyer search filters",
        cardMessage: "I prepared practical filters you can use in the lawyer directory.",
        status: "info"
      };
    }
  },
  {
    name: "prepare_case_brief",
    description: "Prepare a lawyer-facing case brief for an assigned matter.",
    kind: "analysis",
    allowedRoles: ["LAWYER"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Case brief",
        instruction:
          "Prepare a lawyer-grade case brief with issue framing, strongest facts, missing proof, procedural risk, damages or relief posture, and recommended strategy."
      });
      return { ok: true, message: artifact.markdown, status: "info", sources: artifact.sources };
    }
  },
  {
    name: "generate_cross_examination_questions",
    description: "Generate cross-examination or challenge questions from the current assigned case record.",
    kind: "analysis",
    allowedRoles: ["LAWYER"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Cross-examination questions",
        instruction:
          "Generate sharp but professional cross-examination or challenge questions grounded only in the current case record."
      });
      return { ok: true, message: artifact.markdown, status: "info", sources: artifact.sources };
    }
  },
  {
    name: "generate_opposition_arguments",
    description: "Generate likely opposition arguments or rebuttal themes against the current assigned case.",
    kind: "analysis",
    allowedRoles: ["LAWYER"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Opposition arguments",
        instruction:
          "List the strongest opposing arguments, factual weak points, and rebuttal pressure points visible on the current record."
      });
      return { ok: true, message: artifact.markdown, status: "info", sources: artifact.sources };
    }
  },
  {
    name: "prepare_debate_session_context",
    description: "Prepare concise debate-mode context for an assigned case before opening a session.",
    kind: "analysis",
    allowedRoles: ["LAWYER"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Debate session context",
        instruction:
          "Prepare a debate-mode context sheet with strongest themes, weakest links, missing proof, likely opposition attacks, and the single best theory of the case."
      });
      return {
        ok: true,
        message: artifact.markdown,
        action: {
          type: "open_debate",
          label: "Open debate mode",
          href: "/lawyer/debate"
        },
        cardTitle: "Debate context ready",
        cardMessage: `Debate prep for **${resolved.legalCase.title}** is ready.`,
        status: "info",
        sources: artifact.sources
      };
    }
  },
  {
    name: "create_case_strategy_plan",
    description: "Create a strategy plan for an assigned case.",
    kind: "analysis",
    allowedRoles: ["LAWYER"],
    schema: caseArtifactSchema,
    async execute({ currentUser, language, question }, args) {
      const resolved = await resolveCaseReference(currentUser, args);
      if ("error" in resolved) return { ok: false, message: resolved.error, status: "info" };
      const artifact = await buildArtifactFromCase({
        currentUser,
        language,
        caseId: resolved.legalCase.id,
        question,
        heading: "Case strategy plan",
        instruction:
          "Prepare a strategic plan with issue framing, proof posture, near-term actions, negotiation options, escalation triggers, and lawyer-only cautions."
      });
      return { ok: true, message: artifact.markdown, status: "info", sources: artifact.sources };
    }
  }
] ;

export const toolMap = toolDefinitions.reduce<Record<AgentToolName, AgentToolDefinition>>(
  (accumulator, tool) => {
    accumulator[tool.name] = tool;
    return accumulator;
  },
  {} as Record<AgentToolName, AgentToolDefinition>
);

export function getAllowedAgentTools(role: Role) {
  return ROLE_TOOL_SET[role]
    .map((toolName) => toolMap[toolName])
    .filter(Boolean);
}

export function getAgentTool(name: string) {
  return toolMap[name as AgentToolName] || null;
}

export function isMutationTool(name: AgentToolName) {
  return toolMap[name].kind === "mutation";
}
