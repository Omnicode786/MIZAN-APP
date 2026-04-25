import { NextResponse } from "next/server";
import { handleApiError, notFound, validationError } from "@/lib/api-response";
import { buildClauseHeatmap } from "@/lib/document-pipeline/heatmap";
import { extractDeadlines } from "@/lib/document-pipeline/deadlines";
import { extractTextFromFile } from "@/lib/document-pipeline/extract";
import { extractTimeline } from "@/lib/document-pipeline/timeline";
import { saveUploadedFile } from "@/lib/file-storage";
import { summarizeDocumentWithAi } from "@/lib/legal-ai";
import { normalizeLanguage } from "@/lib/language";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRoadmapForCase } from "@/lib/case-roadmap";

export async function POST(request: Request) {
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

    const stored = await saveUploadedFile(file);
    const extractedText = await extractTextFromFile(stored.absolutePath, file.type);
    const aiSummary = await summarizeDocumentWithAi(
      stored.absolutePath,
      file.type || "application/octet-stream",
      extractedText || file.name,
      language
    );
    const textForAnalysis = extractedText || aiSummary.text || file.name;
    const timeline = extractTimeline(textForAnalysis);
    const deadlines = extractDeadlines(textForAnalysis);
    const heatmap = buildClauseHeatmap(textForAnalysis);

    const document = await prisma.document.create({
      data: {
        caseId,
        uploadedById: user.id,
        fileName: file.name,
        filePath: stored.publicPath,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        fileType: inferDocumentType(file.type),
        sourceType: user.role === "LAWYER" ? "LAWYER_UPLOAD" : "USER_UPLOAD",
        probableCategory: legalCase.category,
        extractedText,
        aiSummary: aiSummary.text,
        tags: heatmap.map((item) => item.clause.toLowerCase().replace(/\s+/g, "-")),
        confidence: aiSummary.confidence,
        metadata: {
          clauses: heatmap,
          timelineDetected: timeline.length,
          deadlinesDetected: deadlines.length
        }
      }
    });

    await prisma.evidenceItem.create({
      data: {
        caseId,
        documentId: document.id,
        label: file.name,
        summary: aiSummary.text.slice(0, 400),
        sourceType: file.type || "file",
        searchableText: textForAnalysis.slice(0, 5000),
        extractedEntities: {
          clauses: heatmap.map((item) => item.clause),
          keywords: heatmap.map((item) => item.excerpt)
        },
        evidenceStrength: Math.min(100, 35 + Math.round(textForAnalysis.length / 30))
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
      data: {
        stage: "Analysis ready",
        status: "ACTIVE",
        caseHealthScore: Math.min(100, legalCase.caseHealthScore + 12),
        evidenceCompleteness: Math.min(100, legalCase.evidenceCompleteness + 18),
        evidenceStrength: Math.min(100, legalCase.evidenceStrength + 14),
        draftReadiness: Math.min(100, legalCase.draftReadiness + 10),
        deadlineRisk: Math.max(5, deadlines.length ? legalCase.deadlineRisk + 8 : legalCase.deadlineRisk),
        escalationReadiness: Math.min(100, legalCase.escalationReadiness + 12)
      }
    });

    await logActivity(caseId, user.id, "DOCUMENT_UPLOADED", `Uploaded ${file.name}.`);
    return NextResponse.json({ document, analysis: { summary: aiSummary, timeline, deadlines, heatmap } });
  } catch (error) {
    return handleApiError(error, "DOCUMENT_UPLOAD_ROUTE", "Unable to upload document.");
  }
}

function inferDocumentType(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("wordprocessingml")) return "DOCX";
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("text/")) return "TEXT";
  return "OTHER";
}
