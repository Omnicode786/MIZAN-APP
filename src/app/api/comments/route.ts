import { NextResponse } from "next/server";
import { z } from "zod";
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
  const user = await requireUser();
  const body = createSchema.parse(await request.json());
  const { legalCase } = await getAccessibleCase(body.caseId);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  if (body.visibility === "PRIVATE" && user.role !== "LAWYER") {
    return NextResponse.json({ error: "Private notes are lawyer-only." }, { status: 403 });
  }

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
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = deleteSchema.parse(await request.json());
  const comment = await prisma.comment.findUnique({ where: { id: body.id } });
  if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  if (comment.authorId !== user.id) return NextResponse.json({ error: "You can delete only your own comments." }, { status: 403 });
  await prisma.comment.delete({ where: { id: body.id } });
  await logActivity(comment.caseId, user.id, "COMMENT_DELETED", "Deleted a comment.");
  return NextResponse.json({ ok: true });
}
