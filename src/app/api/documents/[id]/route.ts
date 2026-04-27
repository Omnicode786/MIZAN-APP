import { NextResponse } from "next/server";
import { handleApiError, notFound } from "@/lib/api-response";
import { buildCloudinaryDownloadUrl, deleteFromCloudinary, getCloudinaryStorageMeta } from "@/lib/cloudinary-storage";
import { readUploadedFileBytes } from "@/lib/document-pipeline/extract";
import { recordStorageMetric, trackError, withApiObservability } from "@/lib/observability";
import { getAccessibleCase, logActivity, requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function contentDisposition(fileName: string, download: boolean) {
  const safeAsciiName = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "");
  const encodedName = encodeURIComponent(fileName);
  return `${download ? "attachment" : "inline"}; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withApiObservability(request, { route: "/api/documents/[id]", feature: "documents.download" }, async () => {
    try {
      await requireUser();
    const document = await prisma.document.findUnique({ where: { id: params.id } });
    if (!document) return notFound();

    const { legalCase } = await getAccessibleCase(document.caseId);
    if (!legalCase) return notFound();

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const cloudinaryMeta = getCloudinaryStorageMeta(document.metadata);
    let bytes: Buffer;

    try {
      bytes = await readUploadedFileBytes(document.filePath, {
        metadata: document.metadata,
        fileName: document.fileName
      });
    } catch (error) {
      if (!cloudinaryMeta?.publicId) {
        throw error;
      }

      const fallbackUrl = buildCloudinaryDownloadUrl({
        publicId: cloudinaryMeta.publicId,
        resourceType: cloudinaryMeta.resourceType,
        format: cloudinaryMeta.format || inferFormat(document.fileName),
        deliveryType: cloudinaryMeta.deliveryType,
        attachment: download
      });

      if (!fallbackUrl) {
        throw error;
      }

      const response = await fetch(fallbackUrl);
      if (!response.ok) {
        recordStorageMetric("cloudinary.download", false, {
          status: response.status,
          documentId: document.id,
          body: await response.text()
        });
        throw error;
      }

      bytes = Buffer.from(await response.arrayBuffer());
    }

    recordStorageMetric("document.download", true, {
      documentId: document.id,
      caseId: document.caseId,
      bytes: bytes.byteLength,
      storageProvider: cloudinaryMeta?.publicId ? "cloudinary" : "local"
    });

      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Disposition": contentDisposition(document.fileName, download),
          "Content-Length": String(bytes.byteLength),
          "Content-Type": document.mimeType || "application/octet-stream",
          "Cache-Control": "private, max-age=60"
        }
      });
    } catch (error) {
      recordStorageMetric("document.download", false, { documentId: params.id });
      return handleApiError(error, "DOCUMENT_GET_ROUTE", "Unable to load document.");
    }
  });
}

function inferFormat(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();
  return extension || undefined;
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  return withApiObservability(request, { route: "/api/documents/[id]", feature: "documents.delete" }, async () => {
    try {
      const user = await requireUser();
    const document = await prisma.document.findUnique({ where: { id: params.id } });
    if (!document) return notFound();
    const { legalCase } = await getAccessibleCase(document.caseId);
    if (!legalCase) return notFound();

    const cloudinaryMeta = getCloudinaryStorageMeta(document.metadata);
    if (cloudinaryMeta?.publicId) {
      try {
        await deleteFromCloudinary(cloudinaryMeta.publicId, cloudinaryMeta.resourceType);
      } catch (error) {
        trackError("cloudinary.delete_document", error, { documentId: document.id });
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
