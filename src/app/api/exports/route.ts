import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, notFound, unauthorized } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { getAccessibleCase } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createCaseBundlePdf } from "@/lib/pdf/export";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  caseId: z.string(),
  includePrivateNotes: z.boolean().optional().default(false)
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user) return unauthorized();

    const body = schema.parse(await request.json());

    const { legalCase } = await getAccessibleCase(body.caseId);
    if (!legalCase) return notFound();

    const pdf = await createCaseBundlePdf({
      caseTitle: legalCase.title,
      summary: legalCase.description || "Generated export bundle summary.",
      timeline: legalCase.timelineEvents.map((item) => ({
        title: item.title,
        date: formatDate(item.eventDate)
      })),
      deadlines: legalCase.deadlines.map((item) => ({
        title: item.title,
        date: formatDate(item.dueDate)
      }))
    });

    const bundle = await prisma.exportBundle.create({
      data: {
        caseId: body.caseId,
        createdById: user.id,
        bundleType: "case_bundle_pdf",
        filePath: pdf.publicPath,
        includePrivateNotes: user.role === "LAWYER" ? body.includePrivateNotes : false
      }
    });

    return NextResponse.json({ bundle, file: pdf.publicPath });
  } catch (error) {
    return handleApiError(error, "EXPORT_ROUTE", "Unable to export this case.");
  }
}
