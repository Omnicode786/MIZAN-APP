import { NextResponse } from "next/server";
import { z } from "zod";
import { AiProviderError } from "@/lib/ai";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { answerPakistaniLegalQuestion, generateAssistantThreadTitle } from "@/lib/legal-ai";
import { normalizeLanguage } from "@/lib/language";
import { getAccessibleCase } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  threadId: z.string().optional(),
  caseId: z.string().optional(),
  documentId: z.string().optional(),
  question: z.string().min(2),
  title: z.string().optional(),
  language: z.enum(["en", "ur", "roman-ur"]).optional()
});

export async function POST(request: Request) {
  const user = await getCurrentUserWithProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await request.json());
  const language = normalizeLanguage(body.language);
  let caseTitle: string | undefined;

  if (body.caseId) {
    const { legalCase } = await getAccessibleCase(body.caseId);
    if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });
    caseTitle = legalCase.title;
  }

  let threadId = body.threadId;
  if (threadId) {
    const existingThread = await prisma.assistantThread.findFirst({
      where: { id: threadId, createdById: user.id }
    });

    if (!existingThread) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    if (
      (existingThread.caseId || null) !== (body.caseId || null) ||
      (existingThread.documentId || null) !== (body.documentId || null)
    ) {
      return NextResponse.json(
        { error: "This thread belongs to a different assistant context." },
        { status: 400 }
      );
    }
  }

  let ai;
  try {
    ai = await answerPakistaniLegalQuestion({
      question: body.question,
      caseId: body.caseId,
      documentId: body.documentId,
      role: user.role,
      simpleLanguageMode: user.clientProfile?.simpleLanguageMode,
      language
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return NextResponse.json(
        {
          error:
            "The AI provider could not return an answer. Please check the configured provider, model, and API key, then try again."
        },
        { status: 502 }
      );
    }

    throw error;
  }

  if (!threadId) {
    const threadTitle = await generateAssistantThreadTitle({
      question: body.question,
      caseTitle,
      language
    });

    const thread = await prisma.assistantThread.create({
      data: {
        createdById: user.id,
        caseId: body.caseId,
        documentId: body.documentId,
        title: threadTitle,
        scope: body.documentId ? "DOCUMENT" : body.caseId ? "CASE" : "GENERAL"
      }
    });
    threadId = thread.id;
  }

  const [, message] = await prisma.$transaction([
    prisma.assistantMessage.create({
      data: {
        threadId,
        role: "USER",
        content: body.question
      }
    }),
    prisma.assistantMessage.create({
      data: {
        threadId,
        role: "AI",
        content: ai.text,
        confidence: ai.confidence,
        sources: ai.sources
      }
    }),
    prisma.assistantThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() }
    })
  ]);

  const thread = await prisma.assistantThread.findUnique({
    where: { id: threadId },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  });

  return NextResponse.json({ thread, message });
}
