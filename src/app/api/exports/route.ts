import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, notFound, unauthorized } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { recordExportMetric, withApiObservability } from "@/lib/observability";
import { getAccessibleCase, logActivity } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createCaseBundlePdf } from "@/lib/pdf/export";
import {
  buildCourtReadyBundleMarkdown,
  writeMarkdownPacket
} from "@/lib/case-packets";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  caseId: z.string(),
  bundleType: z.enum(["case_bundle_pdf", "court_ready_bundle"]).optional().default("case_bundle_pdf"),
  includePrivateNotes: z.boolean().optional().default(false)
});

export async function POST(request: Request) {
  return withApiObservability(request, { route: "/api/exports", feature: "exports" }, async () => {
    try {
      const user = await getCurrentUserWithProfile();
      if (!user) return unauthorized();

    const body = schema.parse(await request.json());

    const { legalCase } = await getAccessibleCase(body.caseId);
    if (!legalCase) return notFound();

    if (body.bundleType === "court_ready_bundle") {
      const includePrivateNotes = user.role === "LAWYER" ? body.includePrivateNotes : false;
      const markdown = buildCourtReadyBundleMarkdown(legalCase, includePrivateNotes);
      const packet = await writeMarkdownPacket({
        caseId: legalCase.id,
        title: legalCase.title,
        kind: "court-ready-bundle",
        markdown
      });

      const bundle = await prisma.exportBundle.create({
        data: {
          caseId: body.caseId,
          createdById: user.id,
          bundleType: "court_ready_bundle",
          title: `Court-ready bundle - ${legalCase.title}`,
          summary: "Chronology, annexure index, deadlines, drafts, and readiness checklist.",
          filePath: packet.publicPath,
          includePrivateNotes,
          metadata: {
            format: "markdown",
            documentCount: legalCase.documents.length,
            timelineCount: legalCase.timelineEvents.length,
            deadlineCount: legalCase.deadlines.length
          }
        }
      });

      await logActivity(legalCase.id, user.id, "COURT_BUNDLE_CREATED", "Created a court-ready bundle.");

      recordExportMetric("court_ready_bundle", true, { userId: user.id, caseId: legalCase.id, bundleId: bundle.id });
      return NextResponse.json({ bundle, file: packet.publicPath, markdown });
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
        title: `Case bundle - ${legalCase.title}`,
        summary: "PDF summary with case overview, timeline, and deadlines.",
        filePath: pdf.publicPath,
        includePrivateNotes: user.role === "LAWYER" ? body.includePrivateNotes : false
      }
    });

    await logActivity(legalCase.id, user.id, "CASE_BUNDLE_CREATED", "Created a PDF case bundle.");

      recordExportMetric("case_bundle_pdf", true, { userId: user.id, caseId: legalCase.id, bundleId: bundle.id });
      return NextResponse.json({ bundle, file: pdf.publicPath });
    } catch (error) {
      recordExportMetric("case_export", false);
      return handleApiError(error, "EXPORT_ROUTE", "Unable to export this case.");
    }
  });
}
