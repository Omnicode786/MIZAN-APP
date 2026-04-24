import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(3).optional(),
  stage: z.string().optional(),
  status: z.enum(["DRAFT", "INTAKE", "ACTIVE", "REVIEW", "ESCALATED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  description: z.string().nullable().optional()
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { legalCase } = await getAccessibleCase(params.id);
  if (!legalCase) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  return NextResponse.json({ case: legalCase });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { legalCase } = await getAccessibleCase(params.id);
    if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });

    const body = patchSchema.parse(await request.json());
    const updated = await prisma.case.update({
      where: { id: params.id },
      data: {
        title: body.title,
        stage: body.stage,
        status: body.status,
        priority: body.priority,
        description: body.description === undefined ? undefined : body.description || null
      }
    });

    await logActivity(params.id, user.id, "CASE_UPDATED", `Updated case workspace fields.`);
    return NextResponse.json({ case: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update case." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const { legalCase } = await getAccessibleCase(params.id);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  if (user.role !== "CLIENT") {
    return NextResponse.json({ error: "Only clients can delete their case." }, { status: 403 });
  }

  await prisma.case.delete({ where: { id: params.id } });
  await logActivity(null, user.id, "CASE_DELETED", `Deleted case ${params.id}`);
  return NextResponse.json({ ok: true });
}
