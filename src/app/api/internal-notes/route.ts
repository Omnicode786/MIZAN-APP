import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, notFound } from "@/lib/api-response";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  caseId: z.string(),
  body: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "LAWYER" || !user.lawyerProfile) return forbidden();

    const body = schema.parse(await request.json());
    const { legalCase } = await getAccessibleCase(body.caseId);
    if (!legalCase) return notFound();

    const note = await prisma.internalNote.create({
      data: { caseId: body.caseId, body: body.body, authorId: user.id },
      include: { author: true }
    });

    await logActivity(body.caseId, user.id, "INTERNAL_NOTE_ADDED", "Added an internal note.");
    return NextResponse.json({ note });
  } catch (error) {
    return handleApiError(error, "INTERNAL_NOTE_CREATE_ROUTE", "Unable to save internal note.");
  }
}
