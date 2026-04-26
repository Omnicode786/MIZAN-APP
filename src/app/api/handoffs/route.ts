import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api-response";
import {
  buildLawyerHandoffMarkdown,
  writeMarkdownPacket
} from "@/lib/case-packets";
import { getAccessibleCase, logActivity } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  caseId: z.string()
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const { user, legalCase } = await getAccessibleCase(body.caseId);
    if (!legalCase) {
      throw new Error("Not found");
    }

    const markdown = buildLawyerHandoffMarkdown(legalCase);
    const packet = await writeMarkdownPacket({
      caseId: legalCase.id,
      title: legalCase.title,
      kind: "lawyer-handoff",
      markdown
    });

    const bundle = await prisma.exportBundle.create({
      data: {
        caseId: legalCase.id,
        createdById: user.id,
        bundleType: "lawyer_handoff_packet",
        title: `Lawyer handoff - ${legalCase.title}`,
        summary: "Structured case summary, evidence index, chronology, deadlines, and lawyer review questions.",
        filePath: packet.publicPath,
        includePrivateNotes: false,
        metadata: {
          format: "markdown",
          documentCount: legalCase.documents.length,
          timelineCount: legalCase.timelineEvents.length,
          deadlineCount: legalCase.deadlines.length
        }
      }
    });

    await logActivity(
      legalCase.id,
      user.id,
      "LAWYER_HANDOFF_CREATED",
      "Created a lawyer handoff packet from the workspace."
    );

    return NextResponse.json({ bundle, file: packet.publicPath, markdown });
  } catch (error) {
    return handleApiError(error, "HANDOFF_PACKET_ROUTE", "Unable to create lawyer handoff packet.");
  }
}
