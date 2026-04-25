import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, notFound } from "@/lib/api-response";
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
  try {
    const { legalCase } = await getAccessibleCase(params.id);
    if (!legalCase) return notFound();

    return NextResponse.json({ case: legalCase });
  } catch (error) {
    return handleApiError(error, "CASE_GET_ROUTE", "Unable to load case.");
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { legalCase } = await getAccessibleCase(params.id);
    if (!legalCase) return notFound();

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
    return handleApiError(error, "CASE_UPDATE_ROUTE", "Unable to update case.");
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { legalCase } = await getAccessibleCase(params.id);
    if (!legalCase) return notFound();
    if (user.role !== "CLIENT") return forbidden();

    await prisma.case.delete({ where: { id: params.id } });
    await logActivity(null, user.id, "CASE_DELETED", `Deleted case ${params.id}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "CASE_DELETE_ROUTE", "Unable to delete case.");
  }
}
