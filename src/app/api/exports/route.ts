import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCaseBundlePdf } from "@/lib/pdf/export";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  caseId: z.string(),
  includePrivateNotes: z.boolean().optional().default(false)
});

export async function POST(request: Request) {
  const user = await getCurrentUserWithProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await request.json());

  const legalCase = await prisma.case.findUnique({
    where: { id: body.caseId },
    include: {
      timelineEvents: true,
      deadlines: true,
      internalNotes: true
    }
  });

  if (!legalCase) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

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
      includePrivateNotes: body.includePrivateNotes
    }
  });

  return NextResponse.json({ bundle, file: pdf.publicPath });
}
