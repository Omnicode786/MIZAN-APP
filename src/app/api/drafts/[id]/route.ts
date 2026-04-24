import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  content: z.string().optional(),
  title: z.string().optional(),
  verificationStatus: z.enum(["UNREVIEWED", "VERIFIED", "NEEDS_CORRECTION"]).optional(),
  type: z.enum([
    "COMPLAINT_LETTER",
    "LEGAL_NOTICE",
    "WARNING_LETTER",
    "RESPONSE_LETTER",
    "REFUND_REQUEST",
    "GRIEVANCE_SUBMISSION",
    "CONTRACT_REVISION",
    "OPINION_BRIEF",
    "OTHER"
  ]).optional(),
  changeSummary: z.string().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const draft = await prisma.draft.findUnique({ where: { id: params.id } });
  if (!draft) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  const { legalCase } = await getAccessibleCase(draft.caseId);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const body = patchSchema.parse(await request.json());
  const updated = await prisma.draft.update({
    where: { id: params.id },
    data: {
      title: body.title,
      type: body.type,
      currentContent: body.content,
      verificationStatus: body.verificationStatus,
      verifiedById: body.verificationStatus === "VERIFIED" && user.role === "LAWYER" ? user.id : undefined
    }
  });

  if (body.content) {
    const count = await prisma.draftVersion.count({ where: { draftId: params.id } });
    await prisma.draftVersion.create({
      data: {
        draftId: params.id,
        createdById: user.id,
        versionNumber: count + 1,
        changeSummary: body.changeSummary || "Manual update",
        content: body.content
      }
    });
  }

  await logActivity(draft.caseId, user.id, "DRAFT_UPDATED", `Updated draft ${updated.title}.`);
  return NextResponse.json({ draft: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const draft = await prisma.draft.findUnique({ where: { id: params.id } });
  if (!draft) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  const { legalCase } = await getAccessibleCase(draft.caseId);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  await prisma.draft.delete({ where: { id: params.id } });
  await logActivity(draft.caseId, user.id, "DRAFT_DELETED", `Deleted draft ${draft.title}.`);
  return NextResponse.json({ ok: true });
}
