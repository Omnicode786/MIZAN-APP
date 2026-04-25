import { z } from "zod";
import {
  appendAssistantActionMeta,
  appendAssistantCasePreviewMeta,
  extractAssistantActionMeta,
  extractAssistantCasePreviewMeta,
  stripAssistantActionMeta,
  type AssistantActionMeta,
  type AssistantCasePreviewMeta
} from "@/lib/assistant-message-meta";
import { getLanguageInstruction, type AppLanguage } from "@/lib/language";
import { answerPakistaniLegalQuestion } from "@/lib/legal-ai";
import { runAiTask } from "@/lib/ai";
import {
  getAgentTool,
  getAllowedAgentTools,
  isMutationTool,
  type AgentToolName,
  type AgentToolResult
} from "@/lib/ai/agent-tools";
import { buildCaseIntakeAgentPrompt } from "@/lib/ai/prompts/case-intake-agent";
import { buildAccessibleCaseWhereForUser, type AppUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type AgentDirective =
  | {
      mode: "tool_call";
      tool: string;
      arguments?: Record<string, unknown>;
    }
  | {
      mode: "ask_follow_up";
      message: string;
    }
  | {
      mode: "answer";
    };

export type AgentRunnerResult = {
  text: string;
  confidence?: number;
  sources?: string[];
  toolName?: AgentToolName;
};

export type RecentAgentMessage = {
  role: string;
  content: string | null;
};

const directiveSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("tool_call"),
    tool: z.string().min(1),
    arguments: z.record(z.unknown()).optional()
  }),
  z.object({
    mode: z.literal("ask_follow_up"),
    message: z.string().min(2)
  }),
  z.object({
    mode: z.literal("answer")
  })
]);

const MUTATION_INTENT_PATTERNS: Partial<Record<AgentToolName, RegExp[]>> = {
  create_case: [/\b(create|open|start|make|file)\b[\s\S]{0,32}\b(case|matter)\b/i],
  update_case: [/\b(update|change|edit|revise)\b[\s\S]{0,32}\b(case|matter|title|description|priority|stage|status)\b/i],
  add_deadline: [/\b(add|set|create|put)\b[\s\S]{0,32}\b(deadline|due date|date)\b/i],
  add_timeline_event: [/\b(add|log|record|put)\b[\s\S]{0,32}\b(timeline|event)\b/i],
  create_draft: [/\b(create|draft|write|make|prepare|generate)\b[\s\S]{0,32}\b(notice|letter|draft|response|refund|complaint|brief)\b/i],
  create_template_document: [/\b(create|draft|write|make|prepare|generate)\b[\s\S]{0,32}\b(template|format|notice|letter|complaint|document)\b/i],
  create_internal_note: [/\b(add|create|save|make)\b[\s\S]{0,32}\b(note|internal note)\b/i],
  create_draft_review_note: [/\b(add|create|save|make)\b[\s\S]{0,32}\b(review note|draft note|internal note)\b/i],
  generate_case_roadmap: [/\b(build|create|generate|add)\b[\s\S]{0,32}\b(roadmap|timeline steps|next-step roadmap)\b/i]
};

function findJsonObject(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function parseDirective(raw: string): AgentDirective | null {
  const candidate = findJsonObject(raw);
  if (!candidate) {
    return null;
  }

  try {
    return directiveSchema.parse(JSON.parse(candidate));
  } catch {
    return null;
  }
}

function hasExplicitMutationIntent(question: string, toolName: AgentToolName) {
  const patterns = MUTATION_INTENT_PATTERNS[toolName];
  if (!patterns?.length) {
    return true;
  }

  return patterns.some((pattern) => pattern.test(question));
}

function formatRecentThreadMessages(messages?: RecentAgentMessage[]) {
  if (!messages?.length) return "";

  return messages
    .map((message) => {
      const role = message.role === "AI" ? "Assistant" : message.role === "USER" ? "User" : message.role;
      const content = stripAssistantActionMeta(message.content || "").replace(/\s+/g, " ").trim().slice(0, 1200);
      return content ? `${role}: ${content}` : "";
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 5000);
}

function isCasePreviewConfirmation(question: string) {
  const normalized = question.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized || isCasePreviewRejection(question)) return false;

  return [
    /^(yes|yeah|yep|ok|okay|confirm|confirmed|proceed)$/i,
    /\b(yes|confirm|confirmed|proceed|go ahead)\b[\s\S]{0,48}\b(create|add|save|publish|database|workspace|case|it)\b/i,
    /\b(create|add|save|publish)\b[\s\S]{0,48}\b(it|this case|the case|case|database|workspace)\b/i,
    /\b(add|save)\b[\s\S]{0,32}\b(database|workspace)\b/i
  ].some((pattern) => pattern.test(normalized));
}

function isCasePreviewRejection(question: string) {
  const normalized = question.toLowerCase().replace(/\s+/g, " ").trim();

  return [
    /^(no|nope|cancel|stop|reject)$/i,
    /\b(cancel|reject|stop)\b[\s\S]{0,32}\b(case|it|creation|intake)?\b/i,
    /\b(do not|don't|dont)\b[\s\S]{0,24}\b(create|add|save|publish)\b/i,
    /\bnot now\b/i
  ].some((pattern) => pattern.test(normalized));
}

function findLatestPendingCasePreview(messages?: RecentAgentMessage[]): AssistantCasePreviewMeta | null {
  if (!messages?.length) return null;

  for (const message of [...messages].reverse()) {
    if (message.role !== "AI") continue;

    const action = extractAssistantActionMeta(message.content || "");
    if (action?.tool === "create_case" && action.status === "success") {
      return null;
    }

    const preview = extractAssistantCasePreviewMeta(message.content || "");
    if (preview?.tool === "create_case" && preview.status === "pending_confirmation") {
      return preview;
    }
  }

  return null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function objectList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .slice(0, 8);
}

const CASE_CATEGORY_VALUES = [
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

function normalizePreviewCategory(value: unknown) {
  const raw = stringValue(value);
  const normalized = raw.toUpperCase().replace(/\s+/g, "_");
  if (CASE_CATEGORY_VALUES.includes(normalized as (typeof CASE_CATEGORY_VALUES)[number])) {
    return normalized;
  }

  const lower = raw.toLowerCase();
  if (lower.includes("payment") || lower.includes("vendor") || lower.includes("delivery")) return "PAYMENT_DISPUTE";
  if (lower.includes("contract") || lower.includes("agreement")) return "CONTRACT_REVIEW";
  if (lower.includes("rent") || lower.includes("tenant") || lower.includes("landlord")) return "RENTAL_TENANCY";
  if (lower.includes("employment") || lower.includes("salary") || lower.includes("termination")) return "EMPLOYMENT";
  if (lower.includes("cyber") || lower.includes("online") || lower.includes("digital") || lower.includes("scam")) return "CYBER_COMPLAINT";
  if (lower.includes("harassment")) return "HARASSMENT";
  if (lower.includes("notice")) return "LEGAL_NOTICE";
  if (lower.includes("evidence")) return "EVIDENCE_ORGANIZATION";
  return "OTHER";
}

function normalizePreviewPriority(value: unknown) {
  const raw = stringValue(value).toUpperCase();
  if (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(raw)) return raw;

  const lower = raw.toLowerCase();
  if (lower.includes("urgent") || lower.includes("critical")) return "CRITICAL";
  if (lower.includes("high")) return "HIGH";
  if (lower.includes("low")) return "LOW";
  return "MEDIUM";
}

function listSection(title: string, values: string[]) {
  if (!values.length) return `### ${title}\n- Not specified yet.`;
  return `### ${title}\n${values.map((value) => `- ${value}`).join("\n")}`;
}

function buildCasePreviewMarkdown(args: Record<string, unknown>) {
  const category = normalizePreviewCategory(args.category);
  const priority = normalizePreviewPriority(args.priority);
  const facts = stringList(args.facts);
  const parties = stringList(args.parties);
  const availableEvidence = [...stringList(args.availableEvidence), ...stringList(args.documentsMentioned)];
  const evidenceGaps = stringList(args.evidenceGaps);
  const recommendedNextSteps = stringList(args.recommendedNextSteps);
  const timeline = [...objectList(args.timeline), ...objectList(args.timelineEvents)];
  const deadlines = objectList(args.deadlines);
  const title =
    stringValue(args.title) ||
    stringValue(args.summary) ||
    facts[0]?.slice(0, 72) ||
    `New ${category.toLowerCase().replace(/_/g, " ")} matter`;
  const description = stringValue(args.description) || stringValue(args.summary) || facts[0] || "Not specified yet.";
  const draftSuggestion =
    category === "PAYMENT_DISPUTE" || category === "BUSINESS_VENDOR"
      ? "A refund request or legal notice draft may be useful after the evidence is organized."
      : "A lawyer-reviewable draft can be prepared after the core facts and evidence are confirmed.";
  const lawyerHandoffSummary = [
    stringValue(args.summary) || description,
    parties.length ? `Parties: ${parties.join(", ")}.` : "",
    availableEvidence.length ? `Evidence available: ${availableEvidence.join(", ")}.` : ""
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "## Case Preview",
    "I have organized the case details below. I have not saved anything to your workspace yet.",
    "### Core Details",
    `- **Title:** ${title}`,
    `- **Category:** ${category}`,
    `- **Priority:** ${priority}`,
    "- **Status:** INTAKE",
    "- **Stage:** AI intake organized",
    `- **Description:** ${description}`,
    listSection("Facts Captured", facts),
    listSection("Parties Mentioned", parties),
    "### Timeline Events",
    timeline.length
      ? timeline
          .map((item) => {
            const eventTitle = stringValue(item.title) || "Timeline event";
            const eventDate = stringValue(item.eventDate) || "Date not specified";
            const eventDescription = stringValue(item.description);
            return `- **${eventDate}:** ${eventTitle}${eventDescription ? ` - ${eventDescription}` : ""}`;
          })
          .join("\n")
      : "- Not specified yet.",
    "### Deadlines",
    deadlines.length
      ? deadlines
          .map((item) => {
            const deadlineTitle = stringValue(item.title) || "Suggested deadline";
            const dueDate = stringValue(item.dueDate) || "Date not specified";
            const importance = normalizePreviewPriority(item.importance);
            return `- **${dueDate}:** ${deadlineTitle} (${importance})`;
          })
          .join("\n")
      : "- Not specified yet.",
    listSection("Evidence Available", availableEvidence),
    listSection("Missing Evidence", evidenceGaps),
    listSection("Recommended Next Steps", recommendedNextSteps),
    "### Draft / Legal Notice Suggestion",
    `- ${draftSuggestion}`,
    "### Lawyer Handoff Summary",
    `- ${lawyerHandoffSummary || "A short handoff summary can be prepared after the case is saved."}`,
    "## Confirm",
    "Do you want me to add this case to your workspace/database?"
  ].join("\n\n");
}

function hasMinimumCasePreviewData(args: Record<string, unknown>) {
  const hasCategory = Boolean(stringValue(args.category));
  const hasNarrative = Boolean(
    stringValue(args.title) ||
      stringValue(args.summary) ||
      stringValue(args.description) ||
      stringList(args.facts).length
  );

  return hasCategory && hasNarrative;
}

function isExplicitCreateCaseRequest(question: string) {
  const normalized = question.toLowerCase().replace(/\s+/g, " ").trim();

  return [
    /\b(create|open|start|make|file)\b[\s\S]{0,48}\b(case|matter)\b/i,
    /\b(case|matter)\b[\s\S]{0,48}\b(create|open|start|make|file)\b/i,
    /\b(add|save)\b[\s\S]{0,48}\b(case|matter)\b[\s\S]{0,48}\b(database|workspace)\b/i,
    /\bcreate\s+(it|this)\b/i
  ].some((pattern) => pattern.test(normalized));
}

async function extractCreateCaseArgsFromThread({
  question,
  recentThreadContext,
  language
}: {
  question: string;
  recentThreadContext: string;
  language: AppLanguage;
}) {
  try {
    const result = await runAiTask(
      [
        "Extract a MIZAN create_case tool argument object from the user's request and recent same-thread context.",
        "Return JSON only. Do not answer in prose.",
        "Do not invent facts. If facts are missing, return only the fields you can support.",
        "Use valid internal enum-like strings in English for category and priority.",
        "Valid category values: CONTRACT_REVIEW, RENTAL_TENANCY, EMPLOYMENT, CYBER_COMPLAINT, HARASSMENT, PAYMENT_DISPUTE, BUSINESS_VENDOR, LEGAL_NOTICE, EVIDENCE_ORGANIZATION, OTHER.",
        "Valid priority values: LOW, MEDIUM, HIGH, CRITICAL.",
        "Use ISO YYYY-MM-DD strings for timeline eventDate and deadline dueDate when dates are clear.",
        "JSON shape:",
        JSON.stringify({
          title: "short case title",
          category: "PAYMENT_DISPUTE",
          priority: "HIGH",
          summary: "short issue summary",
          description: "case description",
          facts: ["fact"],
          parties: ["party"],
          availableEvidence: ["evidence"],
          documentsMentioned: ["document"],
          evidenceGaps: ["missing evidence"],
          recommendedNextSteps: ["next step"],
          lawyerReviewRecommended: true,
          timeline: [
            {
              title: "event title",
              description: "event detail",
              eventDate: "YYYY-MM-DD",
              sourceLabel: "user-provided",
              confidence: 0.82
            }
          ],
          deadlines: [
            {
              title: "deadline title",
              dueDate: "YYYY-MM-DD",
              importance: "HIGH",
              notes: "notes"
            }
          ]
        }),
        getLanguageInstruction(language)
      ].join("\n\n"),
      [
        recentThreadContext ? `Recent same-thread context:\n${recentThreadContext}` : "No previous context.",
        `Current user request:\n${question}`
      ].join("\n\n"),
      { maxOutputTokens: 1400, temperature: 0.1 }
    );

    const candidate = findJsonObject(result.text) || result.text;
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    console.error("[AGENT_CASE_EXTRACTION_ERROR]", error);
    return null;
  }
}

async function buildCreateCasePreviewResponse({
  args,
  language
}: {
  args: Record<string, unknown>;
  language: AppLanguage;
}): Promise<AgentRunnerResult> {
  const previewMarkdown = buildCasePreviewMarkdown(args);
  const localizedPreview = await localizeSimpleText(previewMarkdown, language);

  return {
    text: appendAssistantCasePreviewMeta(localizedPreview, {
      tool: "create_case",
      status: "pending_confirmation",
      arguments: args,
      title: stringValue(args.title) || stringValue(args.summary),
      createdAt: new Date().toISOString()
    }),
    confidence: 0.91,
    sources: ["Case intake preview"],
    toolName: "create_case"
  };
}

async function localizeSimpleText(text: string, language: AppLanguage) {
  if (language === "en") {
    return text;
  }

  try {
    const result = await runAiTask(
      [
        "Translate the supplied assistant content into the selected language.",
        getLanguageInstruction(language),
        "Return only the translated content.",
        "Do not add or remove meaning."
      ].join("\n\n"),
      text,
      { maxOutputTokens: 600, temperature: 0.1 }
    );

    return result.text;
  } catch {
    return text;
  }
}

async function localizeToolResult(result: AgentToolResult, language: AppLanguage) {
  if (language === "en") {
    return result;
  }

  const payload = {
    message: result.message,
    cardTitle: result.cardTitle || "",
    cardMessage: result.cardMessage || "",
    actionLabel: result.action?.label || ""
  };

  try {
    const localized = await runAiTask(
      [
        "Translate the supplied JSON values into the selected language.",
        getLanguageInstruction(language),
        "Preserve JSON keys exactly as they are.",
        "Keep Markdown inside string values intact where present.",
        "Return JSON only."
      ].join("\n\n"),
      JSON.stringify(payload),
      { maxOutputTokens: 1200, temperature: 0.1 }
    );

    const parsed = JSON.parse(findJsonObject(localized.text) || localized.text);
    return {
      ...result,
      message: typeof parsed.message === "string" ? parsed.message : result.message,
      cardTitle: typeof parsed.cardTitle === "string" && parsed.cardTitle ? parsed.cardTitle : result.cardTitle,
      cardMessage: typeof parsed.cardMessage === "string" && parsed.cardMessage ? parsed.cardMessage : result.cardMessage,
      action:
        result.action && typeof parsed.actionLabel === "string" && parsed.actionLabel
          ? { ...result.action, label: parsed.actionLabel }
          : result.action
    };
  } catch {
    return result;
  }
}

async function buildAgentContext(currentUser: AppUser, caseId?: string, documentId?: string) {
  const recentCases = await prisma.case.findMany({
    where: buildAccessibleCaseWhereForUser(currentUser),
    select: {
      id: true,
      title: true,
      category: true,
      stage: true,
      updatedAt: true
    },
    orderBy: { updatedAt: "desc" },
    take: 8
  });

  const selectedCase = caseId
    ? await prisma.case.findFirst({
        where: buildAccessibleCaseWhereForUser(currentUser, caseId),
        select: { id: true, title: true, category: true, stage: true, status: true }
      })
    : null;

  const selectedDocument = documentId
    ? await prisma.document.findFirst({
        where: {
          id: documentId,
          case: buildAccessibleCaseWhereForUser(currentUser, caseId)
        },
        select: { id: true, fileName: true, probableCategory: true }
      })
    : null;

  return {
    selectedCase,
    selectedDocument,
    context: [
      `Current user role: ${currentUser.role}`,
      currentUser.clientProfile ? "Client profile is available." : "Client profile is missing.",
      currentUser.lawyerProfile ? "Lawyer profile is available." : "Lawyer profile is missing.",
      selectedCase
        ? `Selected case: ${selectedCase.title} (${selectedCase.category}, ${selectedCase.status}, ${selectedCase.stage})`
        : "No selected case.",
      selectedDocument
        ? `Selected document: ${selectedDocument.fileName} (${selectedDocument.probableCategory || "n/a"})`
        : "No selected document.",
      recentCases.length
        ? `Accessible cases:\n${recentCases
            .map((item) => `- ${item.title} [${item.category}] stage: ${item.stage}`)
            .join("\n")}`
        : "No accessible cases found."
    ].join("\n\n")
  };
}

function toActionMeta(toolName: AgentToolName, result: AgentToolResult): AssistantActionMeta | null {
  if (!result.action && !result.cardTitle && !result.cardMessage) {
    return null;
  }

  return {
    tool: toolName,
    title: result.cardTitle || "Agent action completed",
    message: result.cardMessage || result.message,
    status: result.status || (result.ok ? "success" : "error"),
    action: result.action
  };
}

async function fallbackAnswer(options: {
  question: string;
  caseId?: string;
  documentId?: string;
  role: "CLIENT" | "LAWYER" | "ADMIN";
  simpleLanguageMode?: boolean;
  language: AppLanguage;
  recentMessages?: RecentAgentMessage[];
}) {
  return answerPakistaniLegalQuestion(options);
}

export async function runAgentTurn({
  currentUser,
  question,
  caseId,
  documentId,
  language,
  simpleLanguageMode,
  recentMessages
}: {
  currentUser: AppUser;
  question: string;
  caseId?: string;
  documentId?: string;
  language: AppLanguage;
  simpleLanguageMode?: boolean;
  recentMessages?: RecentAgentMessage[];
}): Promise<AgentRunnerResult> {
  const allowedTools = getAllowedAgentTools(currentUser.role);
  const promptTools = allowedTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    kind: tool.kind
  }));
  const agentContext = await buildAgentContext(currentUser, caseId, documentId);
  const recentThreadContext = formatRecentThreadMessages(recentMessages);
  const pendingCasePreview = findLatestPendingCasePreview(recentMessages);

  if (pendingCasePreview && isCasePreviewRejection(question)) {
    return {
      text: await localizeSimpleText("No case was saved. I will keep this as a discussion only.", language),
      confidence: 0.9,
      sources: ["Pending case preview"]
    };
  }

  if (pendingCasePreview && isCasePreviewConfirmation(question)) {
    const createCaseTool = getAgentTool("create_case");

    if (!createCaseTool || !createCaseTool.allowedRoles.includes(currentUser.role)) {
      return {
        text: await localizeSimpleText(
          "This action is available for clients. As a lawyer, I can prepare a case brief or internal strategy for an assigned matter.",
          language
        ),
        confidence: 0.86,
        sources: ["Pending case preview"]
      };
    }

    const parsedPreview = createCaseTool.schema.safeParse(pendingCasePreview.arguments || {});
    if (!parsedPreview.success || !hasMinimumCasePreviewData(parsedPreview.data as Record<string, unknown>)) {
      return {
        text: await localizeSimpleText(
          "The saved case preview is missing essential details. Please tell me the key facts again and I will prepare a fresh preview before saving it.",
          language
        ),
        confidence: 0.78,
        sources: ["Pending case preview"]
      };
    }

    try {
      const rawResult = await createCaseTool.execute(
        {
          currentUser,
          question,
          language,
          caseId,
          documentId,
          prisma
        },
        parsedPreview.data
      );
      const localizedResult = await localizeToolResult(rawResult, language);
      const actionMeta = toActionMeta(createCaseTool.name, localizedResult);

      return {
        text: appendAssistantActionMeta(localizedResult.message, actionMeta),
        confidence: localizedResult.ok ? 0.94 : 0.85,
        sources: Array.from(new Set([`Tool: ${createCaseTool.name}`, ...(localizedResult.sources || [])])).slice(0, 8),
        toolName: createCaseTool.name
      };
    } catch (error) {
      console.error("[AGENT_CASE_CONFIRMATION_ERROR]", error);

      return {
        text: await localizeSimpleText("I could not create the case right now. Please try again.", language),
        confidence: 0.7,
        sources: ["Tool: create_case"],
        toolName: "create_case"
      };
    }
  }

  const shouldPrepareCasePreview =
    isExplicitCreateCaseRequest(question) ||
    (!pendingCasePreview && isCasePreviewConfirmation(question) && Boolean(recentThreadContext));

  if (shouldPrepareCasePreview) {
    const createCaseTool = getAgentTool("create_case");

    if (!createCaseTool || !createCaseTool.allowedRoles.includes(currentUser.role)) {
      return {
        text: await localizeSimpleText(
          "This action is available for clients. As a lawyer, I can prepare a case brief or internal strategy for an assigned matter.",
          language
        ),
        confidence: 0.86,
        sources: ["Tool: create_case"],
        toolName: "create_case"
      };
    }

    const extractedArgs = await extractCreateCaseArgsFromThread({
      question,
      recentThreadContext,
      language
    });
    const parsedArgs = createCaseTool.schema.safeParse(extractedArgs || {});

    if (!parsedArgs.success || !hasMinimumCasePreviewData(parsedArgs.data as Record<string, unknown>)) {
      return {
        text: await localizeSimpleText(
          "I can create the case, but I need the core facts first. Please tell me what happened, who was involved, any key dates or amounts, and what evidence you have.",
          language
        ),
        confidence: 0.84,
        sources: ["Tool: create_case"],
        toolName: "create_case"
      };
    }

    return buildCreateCasePreviewResponse({
      args: parsedArgs.data as Record<string, unknown>,
      language
    });
  }

  const decisionPrompt = buildCaseIntakeAgentPrompt({
    role: currentUser.role,
    language,
    tools: promptTools,
    caseTitle: agentContext.selectedCase?.title,
    hasCaseContext: Boolean(agentContext.selectedCase),
    hasDocumentContext: Boolean(agentContext.selectedDocument)
  });

  let decisionText = "";
  try {
    const decision = await runAiTask(
      decisionPrompt,
      [
        agentContext.context,
        recentThreadContext ? `Recent conversation from this same thread:\n${recentThreadContext}` : "",
        `User request:\n${question}`
      ]
        .filter(Boolean)
        .join("\n\n"),
      {
        maxOutputTokens: 1200,
        temperature: 0.1
      }
    );
    decisionText = decision.text;
  } catch (error) {
    console.error("[AGENT_DECISION_ERROR]", error);
    const fallback = await fallbackAnswer({
      question,
      caseId,
      documentId,
      role: currentUser.role,
      simpleLanguageMode,
      language,
      recentMessages
    });
    return fallback;
  }

  const directive = parseDirective(decisionText);
  if (!directive || directive.mode === "answer") {
    const fallback = await fallbackAnswer({
      question,
      caseId,
      documentId,
      role: currentUser.role,
      simpleLanguageMode,
      language,
      recentMessages
    });
    return fallback;
  }

  if (directive.mode === "ask_follow_up") {
    return {
      text: await localizeSimpleText(directive.message, language),
      confidence: 0.85
    };
  }

  const tool = getAgentTool(directive.tool);
  if (!tool) {
    const fallback = await fallbackAnswer({
      question,
      caseId,
      documentId,
      role: currentUser.role,
      simpleLanguageMode,
      language,
      recentMessages
    });
    return fallback;
  }

  if (!tool.allowedRoles.includes(currentUser.role)) {
    if (tool.name === "create_case") {
      return {
        text: await localizeSimpleText(
          "This action is available for clients. As a lawyer, I can prepare a case brief or internal strategy for an assigned matter.",
          language
        ),
        confidence: 0.86,
        sources: [`Tool: ${tool.name}`],
        toolName: tool.name
      };
    }

    const fallback = await fallbackAnswer({
      question,
      caseId,
      documentId,
      role: currentUser.role,
      simpleLanguageMode,
      language,
      recentMessages
    });
    return fallback;
  }

  if (isMutationTool(tool.name) && !hasExplicitMutationIntent(question, tool.name)) {
    return {
      text: await localizeSimpleText(
        "I can do that for you once you explicitly ask me to create or update it. If you want me to proceed, tell me clearly what action to take.",
        language
      ),
      confidence: 0.86
    };
  }

  const parsedArgs = tool.schema.safeParse(directive.arguments || {});
  if (!parsedArgs.success) {
    return {
      text: await localizeSimpleText(
        "I need a little more information before I can complete that action. Please tell me the missing details and I will handle it.",
        language
      ),
      confidence: 0.84
    };
  }

  if (tool.name === "create_case") {
    const previewArgs = parsedArgs.data as Record<string, unknown>;

    if (!hasMinimumCasePreviewData(previewArgs)) {
      return {
        text: await localizeSimpleText(
          "I can create the case, but I need the core facts first. Please tell me what happened, who was involved, any key dates, and what evidence you have.",
          language
        ),
        confidence: 0.84,
        sources: [`Tool: ${tool.name}`],
        toolName: tool.name
      };
    }

    return buildCreateCasePreviewResponse({ args: previewArgs, language });
  }

  try {
    const rawResult = await tool.execute(
      {
        currentUser,
        question,
        language,
        caseId,
        documentId,
        prisma
      },
      parsedArgs.data
    );
    const localizedResult = await localizeToolResult(rawResult, language);
    const actionMeta = toActionMeta(tool.name, localizedResult);

    return {
      text: appendAssistantActionMeta(localizedResult.message, actionMeta),
      confidence: localizedResult.ok ? 0.93 : 0.85,
      sources: Array.from(new Set([`Tool: ${tool.name}`, ...(localizedResult.sources || [])])).slice(0, 8),
      toolName: tool.name
    };
  } catch (error) {
    console.error("[AGENT_TOOL_EXECUTION_ERROR]", {
      tool: tool.name,
      error
    });

    return {
      text: await localizeSimpleText(
        "I could not complete that action. Please try again or create it manually.",
        language
      ),
      confidence: 0.7,
      sources: [`Tool: ${tool.name}`],
      toolName: tool.name
    };
  }
}
