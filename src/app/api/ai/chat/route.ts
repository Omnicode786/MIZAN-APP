import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { answerPakistaniLegalQuestion } from "@/lib/legal-ai";
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
  if (body.caseId) {
    const { legalCase } = await getAccessibleCase(body.caseId);
    if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  let threadId = body.threadId;
  if (!threadId) {
    const thread = await prisma.assistantThread.create({
      data: {
        createdById: user.id,
        caseId: body.caseId,
        documentId: body.documentId,
        title: body.title || body.question.slice(0, 80),
        scope: body.documentId ? "DOCUMENT" : body.caseId ? "CASE" : "GENERAL"
      }
    });
    threadId = thread.id;
  }

  await prisma.assistantMessage.create({
    data: {
      threadId,
      role: "USER",
      content: body.question
    }
  });

  const ai = await answerPakistaniLegalQuestion({
    question: body.question,
    caseId: body.caseId,
    documentId: body.documentId,
    role: user.role,
    simpleLanguageMode: user.clientProfile?.simpleLanguageMode,
    language
  });

  const message = await prisma.assistantMessage.create({
    data: {
      threadId,
      role: "AI",
      content: ai.text,
      confidence: ai.confidence,
      sources: ai.sources
    }
  });

  const thread = await prisma.assistantThread.findUnique({
    where: { id: threadId },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  });

  return NextResponse.json({ thread, message });
}
