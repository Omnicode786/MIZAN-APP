import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  caseId: z.string(),
  body: z.string().min(1)
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (user.role !== "LAWYER") {
    return NextResponse.json({ error: "Only lawyers can create internal notes." }, { status: 403 });
  }

  const body = schema.parse(await request.json());
  const { legalCase } = await getAccessibleCase(body.caseId);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const note = await prisma.internalNote.create({
    data: { caseId: body.caseId, body: body.body, authorId: user.id },
    include: { author: true }
  });

  await logActivity(body.caseId, user.id, "INTERNAL_NOTE_ADDED", "Added an internal note.");
  return NextResponse.json({ note });
}
