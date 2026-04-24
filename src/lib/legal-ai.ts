import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { runAiTask, runVisionAiTask } from "@/lib/ai";
import { buildPakistanLawContext } from "@/lib/pakistan-law/retrieval";
import { getRoadmapForCase } from "@/lib/case-roadmap";
import {
  getLanguageInstruction,
  normalizeLanguage,
  type AppLanguage
} from "@/lib/language";

function compact(text: string | null | undefined, fallback = "") {
  return (text || fallback).replace(/\s+/g, " ").trim();
}

export async function buildCaseContext(caseId: string) {
  const legalCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      client: { include: { user: true } },
      assignments: { include: { lawyer: { include: { user: true } } } },
      documents: { orderBy: { createdAt: "desc" } },
      evidenceItems: { orderBy: { createdAt: "desc" } },
      timelineEvents: { orderBy: { eventDate: "asc" } },
      deadlines: { orderBy: { dueDate: "asc" } },
      drafts: { orderBy: { updatedAt: "desc" }, take: 3 },
      riskScores: true
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
        `- ${doc.fileName}: ${compact(doc.aiSummary || doc.extractedText, "No summary available.").slice(0, 1200)}`
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

export async function answerPakistaniLegalQuestion({
  question,
  caseId,
  documentId,
  role,
  simpleLanguageMode,
  language
}: {
  question: string;
  caseId?: string;
  documentId?: string;
  role: "CLIENT" | "LAWYER" | "ADMIN";
  simpleLanguageMode?: boolean;
  language?: AppLanguage;
}) {
  const outputLanguage = normalizeLanguage(language);
  let context = "";
  let sources: string[] = [];

  if (caseId) {
    const built = await buildCaseContext(caseId);
    if (built) {
      context += `Case workspace context:\n${built.text}\n\n`;
      sources.push(...built.legalCase.documents.slice(0, 4).map((item) => item.fileName));
    }
  }

  if (documentId) {
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (document) {
      context += `Focused document context (${document.fileName}):\n${compact(document.extractedText || document.aiSummary, document.fileName)}\n\n`;
      sources.push(document.fileName);
    }
  }

  const law = buildPakistanLawContext(`${question}\n${context}`);
  sources.push(...law.matches.map((item) => item.title));

  const prompt = [
    "You are MIZAN's Pakistani legal workflow assistant.",
    "You are assistive, careful, and structured like a professional Pakistani lawyer reasoning through a file.",
    getLanguageInstruction(outputLanguage),
    
    "Reason from the provided Pakistan-law context and the uploaded case record. Do not invent facts outside the record.",
    role === "LAWYER"
      ? "Address the user as a lawyer and include litigation/procedural posture, evidence gaps, and opposition risks where relevant."
      : simpleLanguageMode
        ? "Use plain language first, then give a short legal framing and practical next steps."
        : "Use clear client-safe language, but keep the analysis professional and structured.",
    "Answer in this structure: 1) Position, 2) Why it matters, 3) Evidence gaps, 4) Suggested next steps, 5) Caution.",
    `Pakistan-law context:\n${law.context}`,
    context ? `Grounded case/document context:\n${context}` : "No case file was supplied.",
    `User question: ${question}`
  ].join("\n\n");

  const response = await runAiTask(prompt, context || question);
  return {
    ...response,
    sources: Array.from(new Set(sources)).slice(0, 8)
  };
}

export async function summarizeDocumentWithAi(
  filePath: string,
  mimeType: string,
  fallbackText: string,
  language?: AppLanguage
) {
  const outputLanguage = normalizeLanguage(language);
  const languageInstruction = getLanguageInstruction(outputLanguage);

  if (mimeType.startsWith("image/")) {
    const bytes = await fs.readFile(filePath);
    const response = await runVisionAiTask(
      `You are reading an uploaded legal document or screenshot from Pakistan. Extract the key legal facts, the parties, dates, deadlines, money amounts, and any threats or demands. Keep it concise and professional.\n\n${languageInstruction}`,
      [{ mimeType, data: bytes.toString("base64") }],
      fallbackText
    );
    return response;
  }

  return runAiTask(
    `Summarize the uploaded legal document. Extract parties, dates, obligations, breach points, and what the document is most useful for in a Pakistani legal workflow.\n\n${languageInstruction}`,
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
    "Return a sharp but professional opposing submission in 1-3 paragraphs.",
    'Give Response In markdown format'
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
