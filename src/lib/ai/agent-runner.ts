import { z } from "zod";
import {
  appendAssistantAgentProposalMeta,
  appendAssistantActionMeta,
  appendAssistantCasePreviewMeta,
  extractAssistantAgentProposalMeta,
  extractAssistantActionMeta,
  extractAssistantCasePreviewMeta,
  stripAssistantActionMeta,
  type AssistantAgentProposalMeta,
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
  create_lawyer_handoff_packet: [/\b(create|prepare|generate|build)\b[\s\S]{0,48}\b(lawyer handoff|handoff packet|handoff brief|lawyer packet)\b/i],
  create_court_ready_bundle: [/\b(create|prepare|generate|build)\b[\s\S]{0,48}\b(court bundle|court-ready|court ready|annexure|case bundle)\b/i],
  request_paid_consultation: [/\b(request|book|schedule|propose|create)\b[\s\S]{0,48}\b(consultation|meeting|paid call|lawyer call)\b/i],
  create_internal_note: [/\b(add|create|save|make)\b[\s\S]{0,32}\b(note|internal note)\b/i],
  create_draft_review_note: [/\b(add|create|save|make)\b[\s\S]{0,32}\b(review note|draft note|internal note)\b/i],
  generate_case_roadmap: [/\b(build|create|generate|add)\b[\s\S]{0,32}\b(roadmap|timeline steps|next-step roadmap)\b/i]
};

function findJsonObject(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Try markdown code fence with json keyword
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  // Try markdown code fence with triple backticks only
  const backtickMatch = trimmed.match(/```([\s\S]*?)```/);
  if (backtickMatch?.[1]) {
    return backtickMatch[1].trim();
  }

  // Try finding braces directly
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  
  // Remove markdown code fence with language specifier (```json, ```typescript, etc.)
  let cleaned = trimmed.replace(/^```(?:json|javascript|typescript|js|ts)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```\s*$/i, "");
  
  return cleaned.trim();
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

function normalizeActionReply(question: string) {
  return question
    .toLowerCase()
    .replace(/[.,!?;:'"`()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isActionConfirmation(question: string) {
  const normalized = normalizeActionReply(question);
  if (!normalized || isActionRejection(question)) return false;

  return [
    /^(yes|yeah|yep|ok|okay|confirm|confirmed|proceed|approved|approve|sure|done|do it|yes please|ok please|okay please|go ahead|haan|han|ji|jee|theek hai|kar do|kardo|save it|add it|create it|apply it)$/i,
    /\b(yes|yeah|yep|ok|okay|sure|confirm|confirmed|approve|approved|proceed|go ahead|haan|han|ji|jee|theek hai)\b[\s\S]{0,80}\b(create|add|save|publish|apply|database|workspace|case|deadline|draft|template|timeline|note|roadmap|it|this|please)\b/i,
    /\b(create|add|save|publish|apply)\b[\s\S]{0,64}\b(it|this|this case|the case|case|deadline|draft|template|timeline|note|roadmap|database|workspace)\b/i,
    /\b(add|save|apply)\b[\s\S]{0,32}\b(database|workspace|changes|action)\b/i,
    /\b(kar do|kardo|save kar do|add kar do|create kar do)\b/i
  ].some((pattern) => pattern.test(normalized));
}

function isActionRejection(question: string) {
  const normalized = normalizeActionReply(question);

  return [
    /^(no|nope|cancel|stop|reject|rejected|not now|no thanks|nah|nahi|naheen)$/i,
    /\b(cancel|reject|stop)\b[\s\S]{0,32}\b(case|it|creation|intake|action|save|draft|deadline|timeline)?\b/i,
    /\b(do not|don't|dont)\b[\s\S]{0,24}\b(create|add|save|publish|apply)\b/i,
    /\bnot now\b/i,
    /\b(nahi|naheen|mat)\b[\s\S]{0,24}\b(karo|karna|save|add|create)\b/i
  ].some((pattern) => pattern.test(normalized));
}

function isCasePreviewConfirmation(question: string) {
  return isActionConfirmation(question);
}

function isCasePreviewRejection(question: string) {
  return isActionRejection(question);
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

function casePreviewToProposal(preview: AssistantCasePreviewMeta): AssistantAgentProposalMeta {
  return {
    tool: "create_case",
    status: "pending_confirmation",
    arguments: preview.arguments,
    title: preview.title || stringValue(preview.arguments.title) || "Create case",
    message: "Create this case in your workspace/database.",
    createdAt: preview.createdAt
  };
}

function findLatestPendingMutationProposal(messages?: RecentAgentMessage[]): AssistantAgentProposalMeta | null {
  if (!messages?.length) return null;

  for (const message of [...messages].reverse()) {
    if (message.role !== "AI") continue;

    const action = extractAssistantActionMeta(message.content || "");
    if (action?.tool) {
      return null;
    }

    const proposal = extractAssistantAgentProposalMeta(message.content || "");
    if (proposal?.status === "pending_confirmation") {
      return proposal;
    }

    const legacyPreview = extractAssistantCasePreviewMeta(message.content || "");
    if (legacyPreview?.tool === "create_case" && legacyPreview.status === "pending_confirmation") {
      return casePreviewToProposal(legacyPreview);
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

function withContextDefaults(
  args: Record<string, unknown>,
  defaults: { caseId?: string; documentId?: string }
) {
  return {
    ...args,
    caseId: stringValue(args.caseId) || defaults.caseId,
    documentId: stringValue(args.documentId) || defaults.documentId
  };
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

function formatPreviewValue(value: unknown): string {
  if (value === null || typeof value === "undefined" || value === "") {
    return "Not specified";
  }

  if (Array.isArray(value)) {
    return value.length
      ? value
          .slice(0, 6)
          .map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)))
          .join("; ")
      : "Not specified";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getMutationProposalTitle(toolName: AgentToolName, args: Record<string, unknown>) {
  switch (toolName) {
    case "update_case":
      return "Update case";
    case "add_deadline":
      return `Add deadline${stringValue(args.title) ? `: ${stringValue(args.title)}` : ""}`;
    case "add_timeline_event":
      return `Add timeline event${stringValue(args.title) ? `: ${stringValue(args.title)}` : ""}`;
    case "create_draft":
      return `Create draft${stringValue(args.title) ? `: ${stringValue(args.title)}` : ""}`;
    case "create_template_document":
      return `Create editable document${stringValue(args.title) ? `: ${stringValue(args.title)}` : ""}`;
    case "create_lawyer_handoff_packet":
      return "Create lawyer handoff packet";
    case "create_court_ready_bundle":
      return "Create court-ready bundle";
    case "request_paid_consultation":
      return "Request paid consultation";
    case "create_internal_note":
      return "Create internal note";
    case "create_draft_review_note":
      return "Create draft review note";
    case "generate_case_roadmap":
      return "Create case roadmap";
    default:
      return "Apply assistant action";
  }
}

function getMutationProposalIntro(toolName: AgentToolName) {
  switch (toolName) {
    case "update_case":
      return "I can update the safe case fields below. I have not saved anything yet.";
    case "add_deadline":
      return "I can add this deadline to the case. I have not saved anything yet.";
    case "add_timeline_event":
      return "I can add this event to the case timeline. I have not saved anything yet.";
    case "create_draft":
      return "I can generate and save this editable draft. I have not created it yet.";
    case "create_template_document":
      return "I can create this editable template document. I have not created it yet.";
    case "create_lawyer_handoff_packet":
      return "I can create and save a lawyer handoff packet from the current case record. I have not created it yet.";
    case "create_court_ready_bundle":
      return "I can create and save a court-ready bundle organizer from the current case record. I have not created it yet.";
    case "request_paid_consultation":
      return "I can create a paid consultation request/proposal connected to this case. I have not saved it yet.";
    case "create_internal_note":
    case "create_draft_review_note":
      return "I can save this lawyer-only note. I have not saved anything yet.";
    case "generate_case_roadmap":
      return "I can add AI roadmap entries to the case timeline. I have not saved anything yet.";
    default:
      return "I can apply this workspace action. I have not saved anything yet.";
  }
}

function buildMutationProposalMarkdown(toolName: AgentToolName, args: Record<string, unknown>) {
  if (toolName === "create_case") {
    return buildCasePreviewMarkdown(args);
  }

  const visibleEntries = Object.entries(args)
    .filter(([, value]) => {
      if (typeof value === "undefined" || value === null || value === "") return false;
      if (Array.isArray(value) && !value.length) return false;
      return true;
    })
    .slice(0, 12);

  const detailLines = visibleEntries.length
    ? visibleEntries.map(([key, value]) => `- **${key}:** ${formatPreviewValue(value)}`)
    : ["- No structured fields were provided yet."];

  return [
    "## Action Preview",
    getMutationProposalIntro(toolName),
    "### Proposed Action",
    `- **Action:** ${toolName}`,
    `- **Title:** ${getMutationProposalTitle(toolName, args)}`,
    "### Details",
    detailLines.join("\n"),
    "## Confirm",
    "Do you want me to save/apply this to your workspace/database?"
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

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function mergeCreateCaseArgs(
  base: Record<string, unknown>,
  override: Record<string, unknown>
) {
  const merged: Record<string, unknown> = {
    ...base,
    ...Object.fromEntries(
      Object.entries(override).filter(([, value]) => {
        if (typeof value === "undefined" || value === null || value === "") return false;
        if (Array.isArray(value) && !value.length) return false;
        return true;
      })
    )
  };

  for (const key of [
    "facts",
    "parties",
    "availableEvidence",
    "documentsMentioned",
    "evidenceGaps",
    "recommendedNextSteps"
  ]) {
    merged[key] = uniqueStrings([base[key], override[key]]);
  }

  for (const key of ["timeline", "timelineEvents", "deadlines"]) {
    const baseList = objectList(base[key]);
    const overrideList = objectList(override[key]);
    merged[key] = [...overrideList, ...baseList].slice(0, 8);
  }

  return merged;
}

function extractUserStoryText(recentThreadContext: string, question: string) {
  const userSegments = (recentThreadContext || "")
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter((segment) => /^User:/i.test(segment))
    .map((segment) => segment.replace(/^User:\s*/i, "").trim())
    .filter(Boolean);

  return [...userSegments, question].join("\n\n").trim();
}

function extractAmount(text: string) {
  const match = text.match(/(?:PKR|Rs\.?|Rupees?)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:PKR|rupees?)/i);
  const value = match?.[1] || match?.[2];
  return value ? `PKR ${value.replace(/,/g, ",")}` : "";
}

function extractTenantName(text: string) {
  const match = text.match(/tenant(?:['\u2019]s)?\s+name\s+is\s+([A-Z][A-Za-z\s.'-]{2,80}?)(?:\.|,|\n|$)/i);
  return match?.[1]?.trim() || "";
}

function extractSimpleSentences(text: string, patterns: RegExp[]) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 8 && patterns.some((pattern) => pattern.test(sentence)))
    .slice(0, 8);
}

function nextMonthlyDay(dayOfMonth: number) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (target <= now) {
    target.setMonth(target.getMonth() + 1);
  }
  return localDateString(target);
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function deriveCreateCaseArgsFromText(text: string): Record<string, unknown> | null {
  const source = text.replace(/\s+/g, " ").trim();
  if (!source || source.length < 20) return null;

  const amount = extractAmount(source);
  const tenantName = extractTenantName(source);

  let category = "OTHER";
  if (/\b(rent|rental|tenant|landlord|vacate|evict|property|house)\b/i.test(source)) {
    category = "RENTAL_TENANCY";
  } else if (/\b(payment|paid|vendor|delivery|refund|dues|outstanding)\b/i.test(source)) {
    category = "PAYMENT_DISPUTE";
  } else if (/\b(contract|agreement|clause)\b/i.test(source)) {
    category = "CONTRACT_REVIEW";
  } else if (/\b(job|salary|employment|termination|employee|employer)\b/i.test(source)) {
    category = "EMPLOYMENT";
  } else if (/\b(online|cyber|scam|account|digital)\b/i.test(source)) {
    category = "CYBER_COMPLAINT";
  } else if (/\b(harass|threat|abuse)\b/i.test(source)) {
    category = "HARASSMENT";
  }

  const facts = extractSimpleSentences(source, [
    /\b(not paid|unpaid|outstanding|dues|rent|tenant|vacate|occupying|reminders?|payment|delivery|agreement|evidence)\b/i
  ]);

  if (!facts.length && !amount && !tenantName && category === "OTHER") return null;

  const parties = uniqueStrings([
    tenantName ? `Tenant: ${tenantName}` : "",
    /\blandlord\b/i.test(source) || /\bmy tenant\b/i.test(source) ? "Landlord/client: current user" : ""
  ]);

  const availableEvidence = uniqueStrings([
    /\brental agreement|rent agreement|tenancy agreement|lease\b/i.test(source) ? "Rental/tenancy agreement" : "",
    /\bwhatsapp|chat|messages?\b/i.test(source) ? "WhatsApp chats/messages and reminders" : "",
    /\breminders?\b/i.test(source) ? "Reminder records" : "",
    /\bbank|transfer|receipt|ledger\b/i.test(source) ? "Payment or rent ledger/receipts" : ""
  ]);

  // This fallback never invents missing evidence or legal next steps. Those
  // richer fields are accepted only from the live AI extraction.
  const evidenceGaps: string[] = [];
  const recommendedNextSteps: string[] = [];

  const title =
    category === "RENTAL_TENANCY"
      ? tenantName
        ? `Rental dispute with ${tenantName}`
        : "Rental arrears and possession dispute"
      : facts[0]?.slice(0, 72) || "New legal matter";

  const summaryParts = [
    category === "RENTAL_TENANCY" ? "Rental/tenancy dispute" : "Legal matter",
    tenantName ? `involving tenant ${tenantName}` : "",
    amount ? `with outstanding amount of ${amount}` : "",
    /\bpast two months|two months|2 months\b/i.test(source) ? "for the past two months" : "",
    /\bvacate|occupying|occupation|possession\b/i.test(source)
      ? "and continued occupation of the property"
      : ""
  ].filter(Boolean);

  const timeline = [
    {
      title: "Rent arrears reported",
      description: amount
        ? `Client reports unpaid rent totaling ${amount}.`
        : "Client reports unpaid rent/dues.",
      eventDate: localDateString(new Date()),
      sourceLabel: "user-provided",
      confidence: 0.78
    },
    /\breminders?\b/i.test(source)
      ? {
          title: "Payment reminders sent",
          description: "Client states that multiple reminders were sent but payment was not made.",
          eventDate: localDateString(new Date()),
          sourceLabel: "user-provided",
          confidence: 0.74
        }
      : null
  ].filter(Boolean);

  const deadlines = /\bdue on the 20th|20th of each month|20 of each month\b/i.test(source)
    ? [
        {
          title: "Next monthly rent due date",
          dueDate: nextMonthlyDay(20),
          importance: "HIGH",
          notes: "Derived from the user's statement that rent is due on the 20th of each month."
        }
      ]
    : [];

  return {
    title,
    category,
    priority: category === "RENTAL_TENANCY" && /\bvacate|occupying|possession\b/i.test(source) ? "HIGH" : "MEDIUM",
    summary: summaryParts.join(" ") || facts[0] || title,
    description: source.slice(0, 1400),
    facts: facts.length ? facts : [source.slice(0, 240)],
    parties,
    availableEvidence,
    documentsMentioned: availableEvidence,
    evidenceGaps,
    recommendedNextSteps,
    lawyerReviewRecommended: true,
    timeline,
    deadlines
  };
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
  const fallbackArgs = deriveCreateCaseArgsFromText(
    extractUserStoryText(recentThreadContext, question)
  );

  try {
    const result = await runAiTask(
      [
        "Extract a MIZAN create_case tool argument object from the user's request and recent same-thread context.",
        "Return JSON only. Do not answer in prose.",
        "Do not invent facts. If facts are missing, return only the fields you can support.",
        "Do not use placeholder values such as unknown, TBD, not specified, sample, demo, or fake names.",
        "For evidenceGaps and recommendedNextSteps, include only items supported by the user's facts or clearly necessary to organize the stated matter.",
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

    let candidate = findJsonObject(result.text);
    
    // If findJsonObject fails, try stripping markdown directly and finding braces
    if (!candidate) {
      const stripped = stripMarkdownCodeFence(result.text);
      const firstBrace = stripped.indexOf("{");
      const lastBrace = stripped.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        candidate = stripped.slice(firstBrace, lastBrace + 1);
      }
    }

    if (!candidate) {
      console.error("[AGENT_CASE_EXTRACTION_ERROR] No valid JSON found in response");
      return fallbackArgs;
    }

    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fallbackArgs;
    }

    return fallbackArgs
      ? mergeCreateCaseArgs(fallbackArgs, parsed as Record<string, unknown>)
      : (parsed as Record<string, unknown>);
  } catch (error) {
    console.error("[AGENT_CASE_EXTRACTION_ERROR]", error);
    return fallbackArgs;
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

async function buildMutationProposalResponse({
  toolName,
  args,
  language
}: {
  toolName: AgentToolName;
  args: Record<string, unknown>;
  language: AppLanguage;
}): Promise<AgentRunnerResult> {
  if (toolName === "create_case") {
    return buildCreateCasePreviewResponse({ args, language });
  }

  const previewMarkdown = buildMutationProposalMarkdown(toolName, args);
  const localizedPreview = await localizeSimpleText(previewMarkdown, language);

  return {
    text: appendAssistantAgentProposalMeta(localizedPreview, {
      tool: toolName,
      status: "pending_confirmation",
      arguments: args,
      title: getMutationProposalTitle(toolName, args),
      message: getMutationProposalIntro(toolName),
      createdAt: new Date().toISOString()
    }),
    confidence: 0.9,
    sources: [`Tool proposal: ${toolName}`],
    toolName
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

    let jsonCandidate = findJsonObject(localized.text);
    
    // If findJsonObject fails, try stripping markdown directly and finding braces
    if (!jsonCandidate) {
      const stripped = stripMarkdownCodeFence(localized.text);
      const firstBrace = stripped.indexOf("{");
      const lastBrace = stripped.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonCandidate = stripped.slice(firstBrace, lastBrace + 1);
      }
    }

    if (!jsonCandidate) {
      // If still no JSON found, return original result
      return result;
    }

    const parsed = JSON.parse(jsonCandidate);
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

function toMutationConclusionMeta(toolName: AgentToolName, result: AgentToolResult): AssistantActionMeta {
  const existing = toActionMeta(toolName, result);
  if (existing) {
    return existing;
  }

  return {
    tool: toolName,
    title: result.ok ? "Agent action completed" : "Agent action not completed",
    message: result.message || (result.ok ? "The action was completed." : "The action could not be completed."),
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

export async function executeAgentMutationProposal({
  currentUser,
  proposal,
  question,
  caseId,
  documentId,
  language
}: {
  currentUser: AppUser;
  proposal: AssistantAgentProposalMeta;
  question: string;
  caseId?: string;
  documentId?: string;
  language: AppLanguage;
}): Promise<AgentRunnerResult> {
  const proposalTool = getAgentTool(proposal.tool);

  if (!proposalTool || !proposalTool.allowedRoles.includes(currentUser.role) || !isMutationTool(proposalTool.name)) {
    const deniedMessage = await localizeSimpleText(
      "I cannot apply that action from this account. I can still help you prepare the information manually.",
      language
    );

    return {
      text: appendAssistantActionMeta(deniedMessage, {
        tool: proposal.tool,
        title: "Action not allowed",
        message: deniedMessage,
        status: "error"
      }),
      confidence: 0.86,
      sources: ["Pending assistant proposal"]
    };
  }

  const parsedProposal = proposalTool.schema.safeParse(
    withContextDefaults(proposal.arguments || {}, { caseId, documentId })
  );
  if (!parsedProposal.success) {
    const validationMessage = await localizeSimpleText(
      "The saved action preview is missing essential details. Please tell me the request again and I will prepare a fresh preview before saving anything.",
      language
    );

    return {
      text: appendAssistantActionMeta(validationMessage, {
        tool: proposalTool.name,
        title: "Action needs a fresh preview",
        message: validationMessage,
        status: "error"
      }),
      confidence: 0.78,
      sources: ["Pending assistant proposal"],
      toolName: proposalTool.name
    };
  }

  if (
    proposalTool.name === "create_case" &&
    !hasMinimumCasePreviewData(parsedProposal.data as Record<string, unknown>)
  ) {
    const validationMessage = await localizeSimpleText(
      "The saved case preview is missing essential details. Please tell me the key facts again and I will prepare a fresh preview before saving it.",
      language
    );

    return {
      text: appendAssistantActionMeta(validationMessage, {
        tool: proposalTool.name,
        title: "Case preview needs details",
        message: validationMessage,
        status: "error"
      }),
      confidence: 0.78,
      sources: ["Pending case preview"],
      toolName: proposalTool.name
    };
  }

  try {
    const rawResult = await proposalTool.execute(
      {
        currentUser,
        question,
        language,
        caseId,
        documentId,
        prisma
      },
      parsedProposal.data
    );
    const localizedResult = await localizeToolResult(rawResult, language);
    const actionMeta = toMutationConclusionMeta(proposalTool.name, localizedResult);

    return {
      text: appendAssistantActionMeta(localizedResult.message, actionMeta),
      confidence: localizedResult.ok ? 0.94 : 0.85,
      sources: Array.from(new Set([`Tool: ${proposalTool.name}`, ...(localizedResult.sources || [])])).slice(0, 8),
      toolName: proposalTool.name
    };
  } catch (error) {
    console.error("[AGENT_ACTION_CONFIRMATION_ERROR]", {
      tool: proposal.tool,
      error
    });

    const failureMessage = await localizeSimpleText(
      "I could not complete that action right now. Please try again.",
      language
    );

    return {
      text: appendAssistantActionMeta(failureMessage, {
        tool: proposalTool.name,
        title: "Agent action failed",
        message: failureMessage,
        status: "error"
      }),
      confidence: 0.7,
      sources: [`Tool: ${proposalTool.name}`],
      toolName: proposalTool.name
    };
  }
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
  const pendingMutationProposal = findLatestPendingMutationProposal(recentMessages);

  if (pendingMutationProposal && isActionRejection(question)) {
    const localizedMessage = await localizeSimpleText(
      "No action was saved. I will keep this as a discussion only.",
      language
    );

    return {
      text: appendAssistantActionMeta(localizedMessage, {
        tool: pendingMutationProposal.tool,
        title: "Action cancelled",
        message: localizedMessage,
        status: "info"
      }),
      confidence: 0.9,
      sources: ["Pending assistant proposal"]
    };
  }

  if (pendingMutationProposal && isActionConfirmation(question)) {
    return executeAgentMutationProposal({
      currentUser,
      proposal: pendingMutationProposal,
      question,
      caseId,
      documentId,
      language
    });
  }

  const shouldPrepareCasePreview =
    isExplicitCreateCaseRequest(question) ||
    (!pendingMutationProposal && isCasePreviewConfirmation(question) && Boolean(recentThreadContext));

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

  const parsedArgs = tool.schema.safeParse(
    withContextDefaults(directive.arguments || {}, { caseId, documentId })
  );
  if (!parsedArgs.success) {
    return {
      text: await localizeSimpleText(
        "I need a little more information before I can complete that action. Please tell me the missing details and I will handle it.",
        language
      ),
      confidence: 0.84
    };
  }

  if (isMutationTool(tool.name)) {
    const proposalArgs = parsedArgs.data as Record<string, unknown>;

    if (tool.name === "create_case" && !hasMinimumCasePreviewData(proposalArgs)) {
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

    return buildMutationProposalResponse({
      toolName: tool.name,
      args: proposalArgs,
      language
    });
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
