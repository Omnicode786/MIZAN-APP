import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, notFound } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { getAccessibleCase } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  caseId: z.string(),
  title: z.string().optional(),
  durationMinutes: z.number().int().min(1).max(30).default(6),
  language: z.enum(["en", "ur", "roman-ur"]).optional()
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user || user.role !== "LAWYER" || !user.lawyerProfile) return forbidden();

    const body = schema.parse(await request.json());
    const { legalCase } = await getAccessibleCase(body.caseId);
    if (!legalCase) return notFound();

    const endsAt = new Date();
    endsAt.setMinutes(endsAt.getMinutes() + body.durationMinutes);

    const session = await prisma.debateSession.create({
      data: {
        caseId: body.caseId,
        lawyerId: user.id,
        title: body.title || `${legalCase.title} debate`,
        endsAt
      },
      include: { turns: { orderBy: { createdAt: "asc" } } }
    });

    return NextResponse.json({ session });
  } catch (error) {
    return handleApiError(error, "DEBATE_SESSION_CREATE_ROUTE", "Unable to start debate.");
  }
}
