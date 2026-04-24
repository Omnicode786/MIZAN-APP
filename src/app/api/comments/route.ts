import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, handleApiError, notFound } from "@/lib/api-response";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  caseId: z.string(),
  body: z.string().min(1),
  visibility: z.enum(["SHARED", "PRIVATE"]).default("SHARED"),
  documentId: z.string().optional()
});

const deleteSchema = z.object({ id: z.string() });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await request.json());
    const { legalCase } = await getAccessibleCase(body.caseId);
    if (!legalCase) return notFound();
    if (body.visibility === "PRIVATE" && user.role !== "LAWYER") return forbidden();

    const comment = await prisma.comment.create({
      data: {
        caseId: body.caseId,
        authorId: user.id,
        body: body.body,
        visibility: body.visibility,
        documentId: body.documentId
      },
      include: { author: true }
    });

    await logActivity(body.caseId, user.id, "COMMENT_ADDED", body.visibility === "PRIVATE" ? "Added a private note." : "Added a shared comment.");
    return NextResponse.json({ comment });
  } catch (error) {
    return handleApiError(error, "COMMENT_CREATE_ROUTE", "Unable to add comment.");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = deleteSchema.parse(await request.json());
    const comment = await prisma.comment.findUnique({ where: { id: body.id } });
    if (!comment) return notFound();
    const { legalCase } = await getAccessibleCase(comment.caseId);
    if (!legalCase) return notFound();
    if (comment.authorId !== user.id) return forbidden();
    await prisma.comment.delete({ where: { id: body.id } });
    await logActivity(comment.caseId, user.id, "COMMENT_DELETED", "Deleted a comment.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "COMMENT_DELETE_ROUTE", "Unable to delete comment.");
  }
}
