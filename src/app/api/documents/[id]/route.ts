import { NextResponse } from "next/server";
import { handleApiError, notFound } from "@/lib/api-response";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const document = await prisma.document.findUnique({ where: { id: params.id } });
    if (!document) return notFound();
    const { legalCase } = await getAccessibleCase(document.caseId);
    if (!legalCase) return notFound();

    await prisma.document.delete({ where: { id: params.id } });
    await logActivity(document.caseId, user.id, "DOCUMENT_DELETED", `Deleted ${document.fileName}.`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "DOCUMENT_DELETE_ROUTE", "Unable to delete document.");
  }
}
