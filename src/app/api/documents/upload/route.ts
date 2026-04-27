import { NextResponse } from "next/server";
import { handleApiError, notFound, validationError } from "@/lib/api-response";
import { buildClauseHeatmap } from "@/lib/document-pipeline/heatmap";
import { extractDeadlines } from "@/lib/document-pipeline/deadlines";
import { extractTextFromBufferWithDiagnostics, inferDocumentMimeType } from "@/lib/document-pipeline/extract";
import { extractTimeline } from "@/lib/document-pipeline/timeline";
import { saveUploadedFile } from "@/lib/file-storage";
import {
  hasReadableDocumentText,
  summarizeDocumentContentWithAi,
  unreadableDocumentSummary
} from "@/lib/legal-ai";
import { normalizeLanguage } from "@/lib/language";
import { recordStorageMetric, withApiObservability } from "@/lib/observability";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRoadmapForCase } from "@/lib/case-roadmap";

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 20 * 1024 * 1024);
const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "message/rfc822",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp"
];

export async function POST(request: Request) {
  return withApiObservability(request, { route: "/api/documents/upload", feature: "documents.upload" }, async () => {
    try {
      const user = await requireUser();
    const formData = await request.formData();
    const caseId = String(formData.get("caseId") || "");
    const file = formData.get("file");
    const language = normalizeLanguage(formData.get("language"));

      if (!caseId || !(file instanceof File)) {
        return validationError("A case and file are required.");
      }

    const { legalCase } = await getAccessibleCase(caseId);
    if (!legalCase) return notFound();

      const mimeType = inferDocumentMimeType(file.name, file.type || "application/octet-stream");
      if (file.size > MAX_UPLOAD_BYTES) {
        recordStorageMetric("document.upload.rejected", false, { reason: "file_too_large", bytes: file.size, mimeType });
        return validationError("File is too large for upload.");
      }
      if (!ALLOWED_UPLOAD_TYPES.includes(mimeType) && !mimeType.startsWith("image/")) {
        recordStorageMetric("document.upload.rejected", false, { reason: "unsupported_type", bytes: file.size, mimeType });
        return validationError("Unsupported file type.");
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const stored = await saveUploadedFile(file, fileBuffer);

    let extractedText = "";
    let extraction = {
      engine: "unsupported",
      warning: "Text extraction was not started."
    };

    try {
      const result = await extractTextFromBufferWithDiagnostics(fileBuffer, mimeType, {
        enableAiOcr: true,
        fileName: file.name
      });
      extractedText = result.text;
      extraction = {
        engine: result.engine,
        warning: result.warning || ""
      };
    } catch (error) {
      console.error("Document text extraction failed after upload.", error);
      extraction.warning = "Document text extraction failed.";
    }

    const extractedTextIsReadable = hasReadableDocumentText(extractedText);
    const isImageUpload = mimeType.startsWith("image/");
    let aiSummary = unreadableDocumentSummary(file.name);

    if (extractedTextIsReadable || isImageUpload) {
      try {
        aiSummary = await summarizeDocumentContentWithAi({
          bytes: isImageUpload ? fileBuffer : undefined,
          mimeType,
          fallbackText: extractedText,
          language
        });
      } catch (error) {
        console.error("Document AI summary failed after upload.", error);
      }
    }

    const summaryLooksReadable =
      isImageUpload &&
      aiSummary.confidence > 0.2 &&
      !/could not safely extract|not contain any legal document|not readable|not stated\/readable/i.test(aiSummary.text);
    const textForAnalysis = extractedTextIsReadable
      ? extractedText
      : summaryLooksReadable
        ? aiSummary.text
        : "";
    const analysisUsable = hasReadableDocumentText(textForAnalysis);
    let timeline: ReturnType<typeof extractTimeline> = [];
    let deadlines: ReturnType<typeof extractDeadlines> = [];
    let heatmap: ReturnType<typeof buildClauseHeatmap> = [];

    if (analysisUsable) {
      try {
        timeline = extractTimeline(textForAnalysis);
        deadlines = extractDeadlines(textForAnalysis);
        heatmap = buildClauseHeatmap(textForAnalysis);
      } catch (error) {
        console.error("Document secondary analysis failed after upload.", error);
      }
    }

    const documentMetadata = {
      storage: stored.metadata,
      analysisStatus: analysisUsable ? "completed" : "text_unreadable",
      extraction,
      ...(analysisUsable
        ? {}
        : {
            analysisWarning: "Text could not be safely extracted. AI facts were not inferred from this upload."
          }),
      clauses: heatmap,
      timelineDetected: timeline.length,
      deadlinesDetected: deadlines.length
    };

    const document = await prisma.document.create({
      data: {
        caseId,
        uploadedById: user.id,
        fileName: file.name,
        filePath: stored.publicPath,
        mimeType,
        sizeBytes: file.size,
        fileType: inferDocumentType(mimeType),
        sourceType: user.role === "LAWYER" ? "LAWYER_UPLOAD" : "USER_UPLOAD",
        probableCategory: legalCase.category,
        extractedText,
        aiSummary: aiSummary.text,
        tags: heatmap.map((item) => item.clause.toLowerCase().replace(/\s+/g, "-")),
        confidence: aiSummary.confidence,
        metadata: documentMetadata
      }
    });

    await prisma.evidenceItem.create({
      data: {
        caseId,
        documentId: document.id,
        label: file.name,
        summary: aiSummary.text.slice(0, 400),
        sourceType: mimeType || "file",
        searchableText: textForAnalysis.slice(0, 5000),
        extractedEntities: {
          clauses: heatmap.map((item) => item.clause),
          keywords: heatmap.map((item) => item.excerpt)
        },
        evidenceStrength: analysisUsable ? Math.min(100, 35 + Math.round(textForAnalysis.length / 30)) : 15
      },
    });

    if (timeline.length) {
      await prisma.timelineEvent.createMany({
        data: timeline.map((item) => ({
          caseId,
          sourceDocumentId: document.id,
          title: item.title,
          description: item.description,
          eventDate: new Date(item.eventDate),
          confidence: item.confidence,
          sourceLabel: "evidence",
          isAiGenerated: true
        }))
      });
    }

    if (deadlines.length) {
      await prisma.deadline.createMany({
        data: deadlines.map((item: any) => ({
          caseId,
          sourceDocumentId: document.id,
          title: item.title,
          dueDate: new Date(item.dueDate),
          notes: item.notes,
          status: item.status,
          importance: item.importance,
          isAiDetected: true
        }))
      });
    }

    const roadmap = getRoadmapForCase(legalCase.category, new Date());
    const existingRoadmapCount = await prisma.timelineEvent.count({ where: { caseId, sourceLabel: "roadmap" } });
    if (!existingRoadmapCount) {
      await prisma.timelineEvent.createMany({
        data: roadmap.map((item) => ({
          caseId,
          title: item.title,
          description: item.description,
          eventDate: item.eventDate,
          confidence: item.confidence,
          sourceLabel: item.sourceLabel,
          isAiGenerated: true
        }))
      });
    }

    await prisma.case.update({
      where: { id: caseId },
      data: analysisUsable
        ? {
            stage: "Analysis ready",
            status: "ACTIVE",
            caseHealthScore: Math.min(100, legalCase.caseHealthScore + 12),
            evidenceCompleteness: Math.min(100, legalCase.evidenceCompleteness + 18),
            evidenceStrength: Math.min(100, legalCase.evidenceStrength + 14),
            draftReadiness: Math.min(100, legalCase.draftReadiness + 10),
            deadlineRisk: Math.max(5, deadlines.length ? legalCase.deadlineRisk + 8 : legalCase.deadlineRisk),
            escalationReadiness: Math.min(100, legalCase.escalationReadiness + 12)
          }
        : {
            stage: "Document uploaded",
            status: "ACTIVE"
          }
    });

    await logActivity(caseId, user.id, "DOCUMENT_UPLOADED", `Uploaded ${file.name}.`);
      recordStorageMetric("document.upload.completed", true, {
        userId: user.id,
        caseId,
        documentId: document.id,
        bytes: file.size,
        mimeType
      });
      return NextResponse.json({ document, analysis: { summary: aiSummary, timeline, deadlines, heatmap } });
    } catch (error) {
      recordStorageMetric("document.upload.completed", false);
      return handleApiError(error, "DOCUMENT_UPLOAD_ROUTE", "Unable to upload document.");
    }
  });
}

function inferDocumentType(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/msword") return "DOC";
  if (mimeType.includes("wordprocessingml")) return "DOCX";
  if (mimeType === "message/rfc822") return "EMAIL";
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (
    mimeType.startsWith("text/") ||
    ["application/json", "application/xml", "application/rtf", "application/csv"].includes(mimeType)
  ) {
    return "TEXT";
  }
  return "OTHER";
}
