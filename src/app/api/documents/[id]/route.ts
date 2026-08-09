import { NextResponse } from "next/server";
import { forbidden, handleApiError, notFound } from "@/lib/api-response";
import { deleteFromCloudinary, getCloudinaryStorageMeta } from "@/lib/cloudinary-storage";
import { recordStorageMetric, trackError, withApiObservability } from "@/lib/observability";
import {
  canPermanentlyRemoveDocumentForUser,
  getAccessibleCase,
  logActivity,
  requireUser
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  buildFileResponse,
  getAuthorizedDocumentFile,
  readAuthorizedStoredFile,
  unlinkStoredLocalFile
} from "@/lib/secure-file-access";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withApiObservability(request, { route: "/api/documents/[id]", feature: "documents.download" }, async () => {
    try {
      const user = await requireUser();
    const document = await getAuthorizedDocumentFile(user, params.id);
    if (!document) return notFound();

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const cloudinaryMeta = getCloudinaryStorageMeta(document.metadata);
    const bytes = await readAuthorizedStoredFile({
      filePath: document.filePath,
      storageKey: document.storageKey,
      metadata: document.metadata,
      fileName: document.fileName
    });

    recordStorageMetric("document.download", true, {
      documentId: document.id,
      caseId: document.caseId,
      bytes: bytes.byteLength,
      storageProvider: document.storageProvider || (cloudinaryMeta?.publicId ? "cloudinary" : "local")
    });

      return buildFileResponse({
        bytes,
        fileName: document.fileName,
        mimeType: document.mimeType,
        download
      });
    } catch (error) {
      recordStorageMetric("document.download", false, { documentId: params.id });
      return handleApiError(error, "DOCUMENT_GET_ROUTE", "Unable to load document.");
    }
  });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  return withApiObservability(request, { route: "/api/documents/[id]", feature: "documents.delete" }, async () => {
    try {
      const user = await requireUser();
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        case: {
          select: {
            clientProfileId: true,
            lawyerOwnerProfileId: true,
            origin: true
          }
        }
      }
    });
    if (!document) return notFound();
    const { legalCase } = await getAccessibleCase(document.caseId);
    if (!legalCase) return notFound();
    if (!canPermanentlyRemoveDocumentForUser(user, document)) {
      await logActivity(document.caseId, user.id, "DOCUMENT_REMOVAL_BLOCKED", `Removal blocked for ${document.fileName}.`, {
        documentId: document.id,
        reason: "Lawyers cannot permanently remove client-owned evidence."
      });
      return forbidden();
    }

    const cloudinaryMeta = getCloudinaryStorageMeta(document.metadata);
    if (cloudinaryMeta?.publicId) {
      try {
        await deleteFromCloudinary(cloudinaryMeta.publicId, cloudinaryMeta.resourceType);
      } catch (error) {
        trackError("cloudinary.delete_document", error, { documentId: document.id });
      }
    } else {
      try {
        await unlinkStoredLocalFile(document.filePath, document.storageKey);
      } catch (error) {
        trackError("local.delete_document", error, { documentId: document.id });
      }
    }

    await prisma.document.delete({ where: { id: params.id } });
    await logActivity(document.caseId, user.id, "DOCUMENT_DELETED", `Deleted ${document.fileName}.`);
      recordStorageMetric("document.delete", true, { userId: user.id, documentId: document.id, caseId: document.caseId });
      return NextResponse.json({ ok: true });
    } catch (error) {
      recordStorageMetric("document.delete", false, { documentId: params.id });
      return handleApiError(error, "DOCUMENT_DELETE_ROUTE", "Unable to delete document.");
    }
  });
}
