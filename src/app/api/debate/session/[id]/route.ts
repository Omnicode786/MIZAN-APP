import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { evaluateDebate, generateDebateOpposition } from "@/lib/legal-ai";
import { normalizeLanguage } from "@/lib/language";
import { prisma } from "@/lib/prisma";

const turnSchema = z.object({
  content: z.string().min(2),
  language: z.enum(["en", "ur", "roman-ur"]).optional()
});

const finalizeSchema = z.object({
  language: z.enum(["en", "ur", "roman-ur"]).optional()
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUserWithProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await prisma.debateSession.findUnique({
    where: { id: params.id },
    include: { turns: { orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }] } }
  });
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  return NextResponse.json({ session });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "LAWYER") {
    return NextResponse.json({ error: "Only lawyers can debate." }, { status: 403 });
  }

  const session = await prisma.debateSession.findUnique({
    where: { id: params.id },
    include: { turns: { orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }] } }
  });
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  if (session.lawyerId !== user.id) return NextResponse.json({ error: "Not your session." }, { status: 403 });

  const body = turnSchema.parse(await request.json());
  const language = normalizeLanguage(body.language);
  const now = new Date();
  const nextRound = Math.floor(session.turns.length / 2) + 1;

  await prisma.debateTurn.create({
    data: {
      sessionId: params.id,
      speaker: "USER",
      content: body.content,
      roundNumber: nextRound
    }
  });

  if (now > session.endsAt) {
    const transcript = [...session.turns.map((item: any) => `${item.speaker}: ${item.content}`), `USER: ${body.content}`].join("\n\n");
    const evaluation = await evaluateDebate({ caseId: session.caseId, transcript, language });
    let parsed;
    try {
      parsed = JSON.parse(evaluation.text.replace(/```json|```/g, ""));
    } catch {
      parsed = { probabilityLawyer: 0.5, label: "Evenly matched", reasoning: evaluation.text, strongerPoints: [], weakerPoints: [] };
    }

    const updated = await prisma.debateSession.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        outcomeProbability: parsed.probabilityLawyer,
        outcomeLabel: parsed.label,
        evaluation: parsed.reasoning
      },
      include: { turns: { orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }] } }
    });

    return NextResponse.json({ session: updated, completed: true, evaluation: parsed });
  }

  const ai = await generateDebateOpposition({
    caseId: session.caseId,
    lawyerArgument: body.content,
    roundNumber: nextRound,
    language
  });

  await prisma.debateTurn.create({
    data: {
      sessionId: params.id,
      speaker: "AI",
      content: ai.text,
      roundNumber: nextRound
    }
  });

  const updated = await prisma.debateSession.findUnique({
    where: { id: params.id },
    include: { turns: { orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }] } }
  });

  return NextResponse.json({ session: updated, completed: false });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "LAWYER") {
    return NextResponse.json({ error: "Only lawyers can finalize debate mode." }, { status: 403 });
  }

  const session = await prisma.debateSession.findUnique({
    where: { id: params.id },
    include: { turns: { orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }] } }
  });
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  let language = normalizeLanguage(undefined);
  try {
    const body = finalizeSchema.parse(await request.json());
    language = normalizeLanguage(body.language);
  } catch {
    language = normalizeLanguage(undefined);
  }

  const transcript = session.turns.map((item: any) => `${item.speaker}: ${item.content}`).join("\n\n");
  const evaluation = await evaluateDebate({ caseId: session.caseId, transcript, language });
  let parsed;
  try {
    parsed = JSON.parse(evaluation.text.replace(/```json|```/g, ""));
  } catch {
    parsed = { probabilityLawyer: 0.5, label: "Evenly matched", reasoning: evaluation.text, strongerPoints: [], weakerPoints: [] };
  }

  const updated = await prisma.debateSession.update({
    where: { id: params.id },
    data: {
      status: "COMPLETED",
      outcomeProbability: parsed.probabilityLawyer,
      outcomeLabel: parsed.label,
      evaluation: parsed.reasoning
    },
    include: { turns: { orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }] } }
  });

  return NextResponse.json({ session: updated, evaluation: parsed });
}
