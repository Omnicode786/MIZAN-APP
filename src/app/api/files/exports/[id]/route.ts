import { handleApiError, notFound } from "@/lib/api-response";
import { recordStorageMetric, withApiObservability } from "@/lib/observability";
import { requireUser } from "@/lib/permissions";
import { buildFileResponse, getAuthorizedExportBundleFile, readAuthorizedStoredFile } from "@/lib/secure-file-access";

function exportFileName(bundle: { title: string | null; bundleType: string; filePath: string }) {
  const extension = bundle.filePath.toLowerCase().endsWith(".pdf") ? "pdf" : "md";
  const base = (bundle.title || bundle.bundleType || "mizan-export")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "mizan-export"}.${extension}`;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withApiObservability(request, { route: "/api/files/exports/[id]", feature: "exports.download" }, async () => {
    try {
      const user = await requireUser();
      const bundle = await getAuthorizedExportBundleFile(user, params.id);
      if (!bundle) return notFound();

      const url = new URL(request.url);
      const download = url.searchParams.get("download") === "1";
      const bytes = await readAuthorizedStoredFile({
        filePath: bundle.filePath,
        metadata: bundle.metadata,
        fileName: exportFileName(bundle)
      });

      recordStorageMetric("export.download", true, {
        bundleId: bundle.id,
        caseId: bundle.caseId,
        bytes: bytes.byteLength
      });

      return buildFileResponse({
        bytes,
        fileName: exportFileName(bundle),
        mimeType: bundle.filePath.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/markdown; charset=utf-8",
        download
      });
    } catch (error) {
      recordStorageMetric("export.download", false, { bundleId: params.id });
      return handleApiError(error, "EXPORT_FILE_GET_ROUTE", "Unable to load export.");
    }
  });
}
