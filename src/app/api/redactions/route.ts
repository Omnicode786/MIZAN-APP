import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { handleApiError, notFound, unauthorized, validationError } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { getAccessibleCase } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redactText } from "@/lib/document-pipeline/redact";

const schema = z.object({
  caseId: z.string(),
  documentId: z.string(),
  rules: z.array(z.string())
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user) return unauthorized();

    const body = schema.parse(await request.json());

    const document = await prisma.document.findUnique({
      where: { id: body.documentId }
    });

    if (!document) return notFound();
    if (document.caseId !== body.caseId) return validationError("Invalid document selection.");
    const { legalCase } = await getAccessibleCase(document.caseId);
    if (!legalCase) return notFound();

    const sourceText = document.extractedText || document.aiSummary || document.fileName;
    const redacted = redactText(sourceText, body.rules);

    const dir = path.join(process.cwd(), "public", "redactions");
    await fs.mkdir(dir, { recursive: true });
    const fileName = `redacted-${Date.now()}.txt`;
    const absolutePath = path.join(dir, fileName);
    await fs.writeFile(absolutePath, redacted);

    const job = await prisma.redactionJob.create({
      data: {
        caseId: body.caseId,
        documentId: body.documentId,
        createdById: user.id,
        rules: body.rules,
        status: "COMPLETED",
        outputPath: `/redactions/${fileName}`
      }
    });

    return NextResponse.json({ job, preview: redacted });
  } catch (error) {
    return handleApiError(error, "REDACTION_ROUTE", "Unable to redact document.");
  }
}
