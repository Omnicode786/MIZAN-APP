import { handleApiError, notFound } from "@/lib/api-response";
import { recordStorageMetric, withApiObservability } from "@/lib/observability";
import { requireUser } from "@/lib/permissions";
import { buildFileResponse, getAuthorizedRedactionFile, readAuthorizedStoredFile } from "@/lib/secure-file-access";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withApiObservability(request, { route: "/api/files/redactions/[id]", feature: "redactions.download" }, async () => {
    try {
      const user = await requireUser();
      const job = await getAuthorizedRedactionFile(user, params.id);
      if (!job || !job.outputPath) return notFound();

      const url = new URL(request.url);
      const download = url.searchParams.get("download") === "1";
      const bytes = await readAuthorizedStoredFile({
        filePath: job.outputPath,
        fileName: `redaction-${job.id}.txt`
      });

      recordStorageMetric("redaction.download", true, {
        redactionJobId: job.id,
        caseId: job.caseId,
        documentId: job.documentId,
        bytes: bytes.byteLength
      });

      return buildFileResponse({
        bytes,
        fileName: `redaction-${job.id}.txt`,
        mimeType: "text/plain; charset=utf-8",
        download
      });
    } catch (error) {
      recordStorageMetric("redaction.download", false, { redactionJobId: params.id });
      return handleApiError(error, "REDACTION_FILE_GET_ROUTE", "Unable to load redaction.");
    }
  });
}
