import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { runAiTask, runVisionAiTask } from "@/lib/ai";
import { readUploadedFileBytes } from "@/lib/document-pipeline/extract";
import { buildPakistanLawContext } from "@/lib/pakistan-law/retrieval";
import { getRoadmapForCase } from "@/lib/case-roadmap";
import { stripAssistantActionMeta } from "@/lib/assistant-message-meta";
import {
  getLanguageInstruction,
  normalizeLanguage,
  type AppLanguage
} from "@/lib/language";

function compact(text: string | null | undefined, fallback = "") {
  return (text || fallback).replace(/\s+/g, " ").trim();
}

export function hasReadableDocumentText(text: string | null | undefined) {
  const normalized = compact(text);
  const meaningfulCharacters = normalized.replace(/[^A-Za-z0-9\u0600-\u06FF]/g, "");

  return normalized.length >= 80 && meaningfulCharacters.length >= 40;
}

export function unreadableDocumentSummary(fileName?: string) {
  const safeFileName = compact(fileName).replace(/[<>]/g, "").slice(0, 120);
  const fileLabel = safeFileName && !safeFileName.includes("\n") ? ` **${safeFileName}**` : "";

  return {
    text: [
      "## Document Uploaded",
      "",
      `The file${fileLabel} was saved successfully, but MIZAN could not safely extract readable text from it.`,
      "",
      "No parties, FIR sections, police station details, dates, allegations, deadlines, or legal conclusions have been inferred from this file.",
      "",
      "Please review the PDF manually in the viewer/download option, or upload a clearer/OCR-readable copy if you want AI analysis."
    ].join("\n"),
    confidence: 0.1
  };
}

type RecentThreadMessage = {
  role: string;
  content: string | null;
};

function formatRecentThreadMessages(messages?: RecentThreadMessage[]) {
  if (!messages?.length) return "";

  return messages
    .map((message) => {
      const role = message.role === "AI" ? "Assistant" : message.role === "USER" ? "User" : message.role;
      const content = compact(stripAssistantActionMeta(message.content || "")).slice(0, 1200);
      return content ? `${role}: ${content}` : "";
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 5000);
}

function cleanThreadTitle(value: string, fallback: string) {
  const cleaned = value
    .replace(/```[\s\S]*?```/g, "")
    .split("\n")[0]
    .replace(/^title\s*:\s*/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return fallback;
  return cleaned.slice(0, 64);
}

const LEGAL_MARKDOWN_RESPONSE_INSTRUCTIONS = [
  "Return Markdown only.",
  "Use these exact Markdown headings in this order:",
  "## Position",
  "## Why It Matters",
  "## Evidence Gaps",
  "## Suggested Next Steps",
  "## Caution",
  "Use short paragraphs and bullet points where helpful.",
  "Bold important dates, deadlines, risks, evidence names, and actions with **bold**.",
  "Do not wrap the answer in a code block."
].join("\n");

const CONVERSATIONAL_MARKDOWN_RESPONSE_INSTRUCTIONS = [
  "Return Markdown only.",
  "For greetings, simple app questions, thanks, or casual messages, reply naturally in 1-3 short paragraphs.",
  "Do not use the legal-analysis headings unless the user asks for legal rights, risks, evidence, procedure, drafting, documents, deadlines, or case strategy.",
  "You may use a short bullet list only if it makes the answer easier to scan.",
  "Do not wrap the answer in a code block."
].join("\n");

function isSmallTalkQuestion(question: string) {
  const q = question.toLowerCase().replace(/[^\p{L}\p{N}\s?]/gu, " ").replace(/\s+/g, " ").trim();

  return [
    /^(hi|hello|hey|salam|assalam o alaikum|assalamu alaikum|aoa)$/,
    /^(how are you|how r u|how are u|kaise ho|kese ho|kia haal hai|kya haal hai)\??$/,
    /^(thanks|thank you|shukriya|ok|okay|cool|great|nice)$/,
    /^(who are you|what are you|what do you do|what can you do|help|can you help me)\??$/,
    /^(test|testing|are you there|hello there)\??$/
  ].some((pattern) => pattern.test(q));
}

function needsLegalAnalysisFormat(question: string, hasCaseOrDocumentContext: boolean) {
  const q = question.toLowerCase();

  const legalSignals = [
    "law", "legal", "right", "rights", "case", "claim", "sue", "court", "judge",
    "lawyer", "advocate", "notice", "contract", "agreement", "breach", "evidence",
    "deadline", "limitation", "fir", "police", "bail", "criminal", "civil",
    "tenant", "rent", "property", "inheritance", "divorce", "khula", "custody",
    "maintenance", "consumer", "refund", "fraud", "cheque", "payment", "salary",
    "employment", "company", "tax", "damages", "appeal", "petition", "draft",
    "document", "clause", "risk", "procedure", "proof", "witness", "hearing",
    "next step", "what should i do", "what can i do", "what is my position"
  ];

  const caseContextSignals = [
    "this case", "my case", "this matter", "this document", "this file", "uploaded",
    "timeline", "evidence", "deadline", "draft", "opponent", "client", "vendor",
    "landlord", "tenant", "employer", "employee", "payment", "delivery"
  ];

  if (legalSignals.some((signal) => q.includes(signal))) return true;
  if (hasCaseOrDocumentContext && caseContextSignals.some((signal) => q.includes(signal))) {
    return true;
  }

  return q.length > 180 && !isSmallTalkQuestion(question);
}

export async function buildCaseContext(caseId: string) {
  const legalCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      stage: true,
      description: true,
      client: {
        select: {
          user: {
            select: {
              name: true
            }
          }
        }
      },
      documents: {
        select: {
          id: true,
          fileName: true,
          probableCategory: true,
          aiSummary: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" },
        take: 8
      },
      evidenceItems: {
        select: {
          id: true,
          label: true,
          summary: true,
          evidenceStrength: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" },
        take: 12
      },
      timelineEvents: {
        select: {
          id: true,
          title: true,
          description: true,
          eventDate: true,
          sourceLabel: true
        },
        orderBy: { eventDate: "asc" },
        take: 20
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
        take: 15
      },
      drafts: {
        select: {
          id: true,
          title: true,
          currentContent: true,
          type: true,
          verificationStatus: true
        },
        orderBy: { updatedAt: "desc" },
        take: 3
      },
      riskScores: {
        select: {
          dimension: true,
          score: true,
          label: true,
          rationale: true
        }
      }
    }
  });

  if (!legalCase) return null;

  const text = [
    `Case title: ${legalCase.title}`,
    `Category: ${legalCase.category}`,
    `Status: ${legalCase.status}`,
    `Stage: ${legalCase.stage}`,
    `Description: ${legalCase.description || "n/a"}`,
    `Client: ${legalCase.client.user.name}`,
    `Documents:`,
    ...legalCase.documents.map(
      (doc) =>
        `- ${doc.fileName}: ${compact(doc.aiSummary, "No summary available.").slice(0, 1200)}`
    ),
    `Evidence:`,
    ...legalCase.evidenceItems.map((item) => `- ${item.label}: ${compact(item.summary)}`),
    `Timeline:`,
    ...legalCase.timelineEvents.map((item) => `- ${item.title} on ${item.eventDate.toISOString()}: ${compact(item.description)}`),
    `Deadlines:`,
    ...legalCase.deadlines.map((item) => `- ${item.title} due ${item.dueDate.toISOString()}: ${compact(item.notes)}`),
    `Drafts:`,
    ...legalCase.drafts.map((draft) => `- ${draft.title}: ${compact(draft.currentContent).slice(0, 900)}`),
    `Risk scores:`,
    ...legalCase.riskScores.map((score) => `- ${score.dimension}: ${score.score} (${score.label}) ${compact(score.rationale)}`),
    `Suggested roadmap:`,
    ...getRoadmapForCase(legalCase.category).map((step) => `- ${step.title}: ${step.description}`)
  ]
    .filter(Boolean)
    .join("\n");

  return { legalCase, text };
}

async function buildMizanLawyerDirectoryContext() {
  try {
    const lawyers = await prisma.lawyerProfile.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        firmName: true,
        city: true,
        specialties: true,
        yearsExperience: true,
        rating: true,
        fixedFeeFrom: true,
        verifiedBadge: true,
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ verifiedBadge: "desc" }, { rating: "desc" }],
      take: 12
    });

    if (!lawyers.length) return "";

    return [
      "MIZAN lawyer directory snapshot:",
      "Use this only when the client asks about finding, choosing, or escalating to a lawyer. Treat a verified badge as MIZAN profile verification only; do not invent licence numbers, bar enrolment details, availability, or outcomes.",
      ...lawyers.map((lawyer) =>
        [
          `- ${lawyer.user.name}`,
          lawyer.firmName ? `firm: ${lawyer.firmName}` : "firm: independent practice",
          lawyer.city ? `city: ${lawyer.city}` : "city: n/a",
          lawyer.specialties.length ? `specialties: ${lawyer.specialties.join(", ")}` : "specialties: n/a",
          `experience: ${lawyer.yearsExperience} years`,
          typeof lawyer.rating === "number" ? `rating: ${lawyer.rating}` : "rating: n/a",
          lawyer.fixedFeeFrom ? `fixed fee from PKR ${lawyer.fixedFeeFrom}` : "fixed fee: proposal based",
          lawyer.verifiedBadge ? "MIZAN verified profile: yes" : "MIZAN verified profile: no"
        ].join("; ")
      )
    ].join("\n");
  } catch (error) {
    console.error("Unable to load MIZAN lawyer directory context.", error);
    return "";
  }
}

export async function answerPakistaniLegalQuestion({
  question,
  caseId,
  documentId,
  role,
  simpleLanguageMode,
  language,
  recentMessages,
  userId
}: {
  question: string;
  caseId?: string;
  documentId?: string;
  role: "CLIENT" | "LAWYER" | "ADMIN";
  simpleLanguageMode?: boolean;
  language?: AppLanguage;
  recentMessages?: RecentThreadMessage[];
  userId?: string;
}) {
  const outputLanguage = normalizeLanguage(language);
  let context = "";
  let sources: string[] = [];
  const recentThreadContext = formatRecentThreadMessages(recentMessages);
  const useLegalAnalysisFormat = needsLegalAnalysisFormat(question, Boolean(caseId || documentId));
  const asksAboutLawyers = /\b(lawyer|advocate|attorney|counsel|hire|find|proposal|represent|representation)\b/i.test(question);
  const lawyerDirectoryContext = asksAboutLawyers ? await buildMizanLawyerDirectoryContext() : "";

  if (caseId && useLegalAnalysisFormat) {
    const built = await buildCaseContext(caseId);
    if (built) {
      context += `Case workspace context:\n${built.text}\n\n`;
      sources.push(...built.legalCase.documents.slice(0, 4).map((item) => item.fileName));
    }
  }

  if (documentId && useLegalAnalysisFormat) {
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (document) {
      context += `Focused document context (${document.fileName}):\n${compact(document.extractedText || document.aiSummary, document.fileName)}\n\n`;
      sources.push(document.fileName);
    }
  }

  if (lawyerDirectoryContext) {
    context += `${lawyerDirectoryContext}\n\n`;
    sources.push("MIZAN lawyer directory");
  }

  const law = useLegalAnalysisFormat
    ? buildPakistanLawContext(`${question}\n${recentThreadContext}\n${context}`)
    : { context: "", matches: [] };
  sources.push(...law.matches.map((item) => item.title));

  const modelInput = [
    recentThreadContext ? `Recent conversation from this same thread:\n${recentThreadContext}` : "",
    context ? `Current grounded case/document context:\n${context}` : "",
    `Current user question: ${question}`
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = [
    "You are MIZAN's in-app Pakistani legal assistant for clients and lawyers.",
    "Be personal, direct, and practical: speak as MIZAN's AI assistant, help the client feel oriented, and keep the tone professional.",
    "MIZAN has lawyer profile and directory data in the supplied context. You may use it to suggest how the client can find a suitable lawyer in MIZAN, but do not invent licensing, bar enrolment, availability, fees, or outcomes.",
    "For non-legal greetings, app-capability questions, thanks, or casual messages, answer like a helpful product assistant instead of forcing a legal memo. Don't entertain fishy/useless messages.",
    "For law-related or case-specific questions, be assistive, careful, and structured like a professional Pakistani lawyer reasoning through a file. This lawyer should work upon existing pakistan law data both from the given data and your existing data as well of the vast law of Pakistan. Act as a senior licensed lawyer make the client believe on you",
    getLanguageInstruction(outputLanguage),
    recentThreadContext
      ? "Use the recent conversation context only for this thread to resolve references and remember what the user just told you. Do not treat it as global memory."
      : "No recent conversation context was supplied.",

    useLegalAnalysisFormat
      ? "Reason from the provided Pakistan-law context, MIZAN platform context, and uploaded case record. Do not invent facts outside the record."
      : "Answer the user's simple message directly. Do not pretend to have reviewed legal materials unless the user asks a legal or case-specific question.",
    useLegalAnalysisFormat
      ? role === "LAWYER"
        ? "Address the user as a lawyer and include litigation/procedural posture, evidence gaps, and opposition risks where relevant."
        : simpleLanguageMode
          ? "Use plain language first, then give a short legal framing and practical next steps."
          : "Use clear client-safe language, but keep the analysis professional and structured."
      : "Keep the reply warm, concise, and natural. Mention that you can help with rights, documents, cases, deadlines, drafts, and lawyer discovery only when useful.",
    useLegalAnalysisFormat
      ? LEGAL_MARKDOWN_RESPONSE_INSTRUCTIONS
      : CONVERSATIONAL_MARKDOWN_RESPONSE_INSTRUCTIONS,
    useLegalAnalysisFormat ? `Pakistan-law context:\n${law.context}` : "Pakistan-law context was not attached because this is not a legal-analysis question.",
    recentThreadContext ? `Recent conversation context:\n${recentThreadContext}` : "No recent thread messages were supplied.",
    context ? `Grounded case/document context:\n${context}` : "No case file was supplied.",
    `User question: ${question}`
  ].join("\n\n");

  const response = await runAiTask(prompt, modelInput || question, {
    feature: "ai.chat",
    userId,
    caseId,
    documentId
  });
  return {
    ...response,
    sources: Array.from(new Set(sources)).slice(0, 8)
  };
}

export async function generateAssistantThreadTitle({
  question,
  caseTitle,
  language
}: {
  question: string;
  caseTitle?: string;
  language?: AppLanguage;
}) {
  const fallback = cleanThreadTitle(question, "Legal question");
  const outputLanguage = normalizeLanguage(language);

  try {
    const result = await runAiTask(
      [
        "Create a short, useful chat title for a MIZAN legal assistant conversation.",
        "Infer the user's real topic from the first message instead of copying the first words.",
        "Return only the title, with no quotes, no markdown, and no punctuation at the end.",
        "Use 3 to 7 words.",
        "Keep the title in the user's selected language.",
        getLanguageInstruction(outputLanguage),
        caseTitle ? `Selected case: ${caseTitle}` : "No case selected.",
        `First user message: ${question}`
      ].join("\n\n"),
      question
    );

    return cleanThreadTitle(result.text, fallback);
  } catch (error) {
    console.error("Unable to generate assistant thread title.", error);
    return fallback;
  }
}

export async function summarizeDocumentWithAi(
  filePath: string,
  mimeType: string,
  fallbackText: string,
  language?: AppLanguage
) {
  const bytes = mimeType.startsWith("image/")
    ? /^https?:\/\//i.test(filePath) || filePath.startsWith("/uploads/")
      ? await readUploadedFileBytes(filePath)
      : await fs.readFile(filePath)
    : undefined;

  return summarizeDocumentContentWithAi({
    bytes,
    mimeType,
    fallbackText,
    language
  });
}

export async function summarizeDocumentContentWithAi({
  bytes,
  mimeType,
  fallbackText,
  language
}: {
  bytes?: Buffer;
  mimeType: string;
  fallbackText: string;
  language?: AppLanguage;
}) {
  const outputLanguage = normalizeLanguage(language);
  const languageInstruction = getLanguageInstruction(outputLanguage);
  const readableFallbackText = hasReadableDocumentText(fallbackText);

  if (mimeType.startsWith("image/")) {
    if (!bytes) {
      return runAiTask(
        [
          "Summarize the uploaded legal document.",
          "Use only the text supplied by the app. If the text is too short or unreadable, say that the document could not be safely analyzed.",
          "Do not infer parties, FIR sections, police station details, dates, allegations, deadlines, money amounts, or legal conclusions from the filename or document type.",
          "Return Markdown only. Use concise headings and bullets.",
          languageInstruction
        ].join("\n\n"),
        fallbackText
      );
    }

    const response = await runVisionAiTask(
      [
        "You are reading an uploaded legal document or screenshot from Pakistan.",
        "Use only text and facts clearly visible in the supplied image.",
        "If a field is unclear or absent, write that it is not stated/readable.",
        "Never invent parties, FIR sections, police station details, dates, allegations, deadlines, money amounts, or legal conclusions from context.",
        "Return Markdown only. Use concise headings, bullets, and **bold** for important dates, parties, deadlines, money amounts, threats, and demands.",
        "Do not wrap the answer in a code block.",
        "Extract the key legal facts, the parties, dates, deadlines, money amounts, and any threats or demands. Keep it concise and professional.",
        languageInstruction
      ].join("\n\n"),
      [{ mimeType, data: bytes.toString("base64") }],
      fallbackText
    );
    return response;
  }

  if (!readableFallbackText) {
    return unreadableDocumentSummary(fallbackText);
  }

  return runAiTask(
    [
      "Summarize the uploaded legal document.",
      "Use only the supplied extracted text. Do not infer facts from the filename, document type, examples, or likely legal templates.",
      "If a party, FIR section, police station, date, allegation, obligation, breach, deadline, money amount, or next action is not stated in the text, say it is not stated.",
      "Return Markdown only. Use concise headings, bullets, and **bold** for important parties, dates, obligations, breach points, and next actions.",
      "Do not wrap the answer in a code block.",
      "Extract parties, dates, obligations, breach points, and what the document is most useful for in a Pakistani legal workflow.",
      languageInstruction
    ].join("\n\n"),
    fallbackText
  );
}

export async function generateDebateOpposition({
  caseId,
  lawyerArgument,
  roundNumber,
  language
}: {
  caseId: string;
  lawyerArgument: string;
  roundNumber: number;
  language?: AppLanguage;
}) {
  const outputLanguage = normalizeLanguage(language);
  const built = await buildCaseContext(caseId);
  const law = buildPakistanLawContext(`${lawyerArgument}\n${built?.text || ""}`);
  const prompt = [
    "You are acting as opposing counsel in a timed legal debate.",
    "Use only the case record and the Pakistan-law context supplied. Do not invent evidence.",
    getLanguageInstruction(outputLanguage),
    "Challenge the lawyer's argument by highlighting uncertainty, missing proof, alternative interpretations, and procedural risk.",
    `Round ${roundNumber}.`,
    `Pakistan-law context:\n${law.context}`,
    `Case record:\n${built?.text || "No case context found."}`,
    `Lawyer's argument:\n${lawyerArgument}`,
    "Return Markdown only. Use short headings, bullets where useful, and **bold** for the strongest risks or missing evidence.",
    "Return a sharp but professional opposing submission in 1-3 paragraphs. Do not wrap the answer in a code block."
  ].join("\n\n");

  return runAiTask(prompt, built?.text || lawyerArgument);
}

export async function evaluateDebate({
  caseId,
  transcript,
  language
}: {
  caseId: string;
  transcript: string;
  language?: AppLanguage;
}) {
  const outputLanguage = normalizeLanguage(language);
  const built = await buildCaseContext(caseId);
  const law = buildPakistanLawContext(`${transcript}\n${built?.text || ""}`);
  const prompt = [
    "You are evaluating a lawyer-versus-AI debate after time expired.",
    "Decide probabilistically who is ahead on the existing record, not who is morally right.",
    "Return JSON only with keys: probabilityLawyer (0-1 number), label, reasoning, strongerPoints (array of strings), weakerPoints (array of strings).",
    "Keep JSON keys in English. Write all user-facing string values in the selected language.",
    getLanguageInstruction(outputLanguage),
    `Pakistan-law context:\n${law.context}`,
    `Case record:\n${built?.text || "No case context found."}`,
    `Transcript:\n${transcript}`
  ].join("\n\n");

  const result = await runAiTask(prompt, transcript);
  return result;
}
