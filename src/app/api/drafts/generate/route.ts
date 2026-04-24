import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, notFound } from "@/lib/api-response";
import { answerPakistaniLegalQuestion, buildCaseContext } from "@/lib/legal-ai";
import { normalizeLanguage } from "@/lib/language";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  caseId: z.string(),
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
  ]),
  title: z.string().min(3),
  language: z.enum(["en", "ur", "roman-ur"]).optional()
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());
    const language = normalizeLanguage(body.language);
    const { legalCase } = await getAccessibleCase(body.caseId);
    if (!legalCase) return notFound();

    const caseContext = await buildCaseContext(body.caseId);
    const ai = await answerPakistaniLegalQuestion({
      question: `Draft a ${body.type} for this case. Use only the file record. Keep it lawyer-editable and do not invent facts.`,
      caseId: body.caseId,
      role: user.role,
      simpleLanguageMode: user.clientProfile?.simpleLanguageMode,
      language
    });

    const latest = await prisma.draft.findFirst({ where: { caseId: body.caseId, title: body.title }, orderBy: { updatedAt: "desc" } });
    let draft;

    if (latest) {
      draft = await prisma.draft.update({
        where: { id: latest.id },
        data: {
          type: body.type,
          currentContent: ai.text,
          verificationStatus: "UNREVIEWED"
        }
      });
      const count = await prisma.draftVersion.count({ where: { draftId: latest.id } });
      await prisma.draftVersion.create({
        data: {
          draftId: latest.id,
          createdById: user.id,
          versionNumber: count + 1,
          changeSummary: "Regenerated from live case context",
          content: ai.text
        }
      });
    } else {
      draft = await prisma.draft.create({
        data: {
          caseId: body.caseId,
          createdById: user.id,
          type: body.type,
          title: body.title,
          currentContent: ai.text,
          verificationStatus: "UNREVIEWED",
          versions: {
            create: {
              createdById: user.id,
              versionNumber: 1,
              changeSummary: "Generated from live case context",
              content: ai.text
            }
          }
        }
      });
    }

    await prisma.case.update({
      where: { id: body.caseId },
      data: {
        draftReadiness: Math.min(100, legalCase.draftReadiness + 12),
        stage: user.role === "LAWYER" ? "Draft revised by lawyer" : "Draft ready for review"
      }
    });

    await logActivity(body.caseId, user.id, "DRAFT_GENERATED", `Generated ${body.title}.`, { groundedIn: caseContext?.legalCase.documents.map((item: any) => item.fileName) || [] });
    return NextResponse.json({ draft, ai });
  } catch (error) {
    return handleApiError(error, "DRAFT_GENERATE_ROUTE", "Unable to generate draft.");
  }
}
