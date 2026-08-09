import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { createSecureStorageTarget, resolveStoredLocalPath } from "@/lib/secure-file-core";

type LegacyKind = "document" | "export" | "redaction";

function isLegacyPublicPath(value?: string | null) {
  if (!value) return false;
  const normalized = value.replace(/\\/g, "/");
  return (
    normalized.startsWith("/uploads/") ||
    normalized.startsWith("uploads/") ||
    normalized.startsWith("/exports/") ||
    normalized.startsWith("exports/") ||
    normalized.startsWith("/redactions/") ||
    normalized.startsWith("redactions/") ||
    normalized.includes("/public/uploads/") ||
    normalized.includes("/public/exports/") ||
    normalized.includes("/public/redactions/")
  );
}

async function copyLegacyFile(kind: LegacyKind, id: string, filePath: string) {
  const sourcePath = resolveStoredLocalPath(filePath);
  if (!sourcePath) return null;

  const target = createSecureStorageTarget(kind === "document" ? "uploads" : kind === "export" ? "exports" : "redactions", path.basename(sourcePath));
  await fs.mkdir(path.dirname(target.absolutePath), { recursive: true });
  await fs.copyFile(sourcePath, target.absolutePath);

  return target;
}

async function migrateDocuments() {
  const documents = await prisma.document.findMany({
    where: {
      storageProvider: "local",
      OR: [{ filePath: { startsWith: "/uploads/" } }, { filePath: { startsWith: "uploads/" } }]
    },
    select: { id: true, filePath: true, metadata: true }
  });

  for (const document of documents) {
    if (!isLegacyPublicPath(document.filePath)) continue;
    const target = await copyLegacyFile("document", document.id, document.filePath);
    if (!target) continue;

    await prisma.document.update({
      where: { id: document.id },
      data: {
        filePath: target.filePath,
        storageBucket: target.storageBucket,
        storageKey: target.storageKey,
        storageUrl: null,
        metadata: {
          ...(document.metadata && typeof document.metadata === "object" && !Array.isArray(document.metadata)
            ? (document.metadata as Record<string, unknown>)
            : {}),
          legacyPublicPath: document.filePath,
          storage: {
            provider: "local",
            bucket: target.storageBucket,
            storageKey: target.storageKey,
            privatePath: target.filePath
          }
        }
      }
    });
  }

  return documents.length;
}

async function migrateExports() {
  const bundles = await prisma.exportBundle.findMany({
    where: {
      OR: [{ filePath: { startsWith: "/exports/" } }, { filePath: { startsWith: "exports/" } }]
    },
    select: { id: true, filePath: true, metadata: true }
  });

  for (const bundle of bundles) {
    if (!isLegacyPublicPath(bundle.filePath)) continue;
    const target = await copyLegacyFile("export", bundle.id, bundle.filePath);
    if (!target) continue;

    await prisma.exportBundle.update({
      where: { id: bundle.id },
      data: {
        filePath: target.filePath,
        metadata: {
          ...(bundle.metadata && typeof bundle.metadata === "object" && !Array.isArray(bundle.metadata)
            ? (bundle.metadata as Record<string, unknown>)
            : {}),
          legacyPublicPath: bundle.filePath,
          storage: {
            provider: "local",
            bucket: target.storageBucket,
            storageKey: target.storageKey,
            privatePath: target.filePath
          }
        }
      }
    });
  }

  return bundles.length;
}

async function migrateRedactions() {
  const jobs = await prisma.redactionJob.findMany({
    where: {
      OR: [{ outputPath: { startsWith: "/redactions/" } }, { outputPath: { startsWith: "redactions/" } }]
    },
    select: { id: true, outputPath: true }
  });

  for (const job of jobs) {
    if (!isLegacyPublicPath(job.outputPath)) continue;
    const target = await copyLegacyFile("redaction", job.id, job.outputPath || "");
    if (!target) continue;

    await prisma.redactionJob.update({
      where: { id: job.id },
      data: { outputPath: target.filePath }
    });
  }

  return jobs.length;
}

async function main() {
  const [documents, bundles, redactions] = await Promise.all([migrateDocuments(), migrateExports(), migrateRedactions()]);
  console.log(
    JSON.stringify(
      {
        ok: true,
        migratedCandidates: { documents, bundles, redactions },
        note: "Legacy public files were copied into .mizan-secure-files and DB paths were updated. Original public files were not deleted."
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
