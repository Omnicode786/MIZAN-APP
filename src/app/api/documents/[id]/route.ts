import { NextResponse } from "next/server";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const { legalCase } = await getAccessibleCase(document.caseId);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  await prisma.document.delete({ where: { id: params.id } });
  await logActivity(document.caseId, user.id, "DOCUMENT_DELETED", `Deleted ${document.fileName}.`);
  return NextResponse.json({ ok: true });
}
