import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { buildCloudinaryDownloadUrl, getCloudinaryStorageMeta } from "@/lib/cloudinary-storage";
import { buildAccessibleCaseWhereForUser, type AppUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const SECURE_SCHEME = "secure://";
const SECURE_ROOT_NAME = ".mizan-secure-files";
const LEGACY_PUBLIC_ROOTS = ["uploads", "exports", "redactions"] as const;

type FileArea = (typeof LEGACY_PUBLIC_ROOTS)[number] | "legacy";

type CaseLite = {
  id: string;
  clientProfileId: string | null;
  lawyerOwnerProfileId?: string | null;
  origin?: string | null;
  hasAcceptedAssignment?: boolean;
  acceptedLawyerProfileIds?: string[];
};

type MetadataLike = Prisma.JsonValue | unknown;

export type FileAccessUser = {
  id?: string;
  role: string;
  clientProfile?: { id: string } | null;
  lawyerProfile?: { id: string } | null;
};

export function getSecureFileRoot() {
  return path.resolve(process.cwd(), SECURE_ROOT_NAME);
}

function sanitizeFileName(value: string, fallback = "file") {
  const parsed = path.parse(value || fallback);
  const base = (parsed.name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const ext = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 16);
  return `${base || fallback}${ext || ""}`;
}

function assertInsideRoot(resolvedPath: string, root: string) {
  const normalizedRoot = path.resolve(root);
  const normalizedPath = path.resolve(resolvedPath);
  if (normalizedPath === normalizedRoot || normalizedPath.startsWith(normalizedRoot + path.sep)) {
    return normalizedPath;
  }
  throw new Error("Forbidden");
}

function normalizeStorageKey(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0") || normalized.split("/").some((part) => part === "..")) {
    throw new Error("Forbidden");
  }
  return normalized;
}

export function createSecureStorageTarget(area: FileArea, originalName: string) {
  const safeName = sanitizeFileName(originalName);
  const storageKey = normalizeStorageKey(`${area}/${randomUUID()}-${safeName}`);
  const absolutePath = assertInsideRoot(path.resolve(getSecureFileRoot(), storageKey), getSecureFileRoot());
  return {
    absolutePath,
    storageKey,
    storageBucket: SECURE_ROOT_NAME,
    filePath: `${SECURE_SCHEME}${storageKey}`
  };
}

export async function writeSecureFile(area: FileArea, originalName: string, data: Buffer | Uint8Array | string) {
  const target = createSecureStorageTarget(area, originalName);
  await fs.mkdir(path.dirname(target.absolutePath), { recursive: true });
  await fs.writeFile(target.absolutePath, data);
  return target;
}

export function resolveStoredLocalPath(filePath: string, storageKey?: string | null) {
  const value = (filePath || "").trim();
  if (!value || /^https?:\/\//i.test(value)) return null;

  if (value.startsWith(SECURE_SCHEME)) {
    const storagePath = normalizeStorageKey(value.slice(SECURE_SCHEME.length));
    return assertInsideRoot(path.resolve(getSecureFileRoot(), storagePath), getSecureFileRoot());
  }

  if (storageKey && value === storageKey) {
    const storagePath = normalizeStorageKey(storageKey);
    return assertInsideRoot(path.resolve(getSecureFileRoot(), storagePath), getSecureFileRoot());
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const normalized = value.replace(/\\/g, "/");
  const legacyRoot = LEGACY_PUBLIC_ROOTS.find(
    (root) => normalized === `/${root}` || normalized.startsWith(`/${root}/`) || normalized.startsWith(`${root}/`)
  );

  if (legacyRoot) {
    const relativeLegacyPath = normalizeStorageKey(normalized.replace(/^\/+/, ""));
    return assertInsideRoot(path.resolve(publicRoot, relativeLegacyPath), path.resolve(publicRoot, legacyRoot));
  }

  if (path.isAbsolute(value)) {
    const resolved = path.resolve(value);
    const secureRoot = getSecureFileRoot();
    if (resolved.startsWith(secureRoot + path.sep)) return resolved;
    for (const root of LEGACY_PUBLIC_ROOTS) {
      const allowedRoot = path.resolve(publicRoot, root);
      if (resolved.startsWith(allowedRoot + path.sep)) return resolved;
    }
    throw new Error("Forbidden");
  }

  const relativePath = normalizeStorageKey(normalized);
  const secureCandidate = path.resolve(getSecureFileRoot(), relativePath);
  if (secureCandidate.startsWith(getSecureFileRoot() + path.sep)) return secureCandidate;

  throw new Error("Forbidden");
}

export function isInactiveFileMetadata(metadata: MetadataLike) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const record = metadata as Record<string, unknown>;
  return Boolean(
    record.deleted ||
      record.isDeleted ||
      record.deletedAt ||
      record.archived ||
      record.isArchived ||
      record.archivedAt ||
      record.status === "DELETED" ||
      record.status === "ARCHIVED"
  );
}

export function isLawyerPrivateMetadata(metadata: MetadataLike) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const record = metadata as Record<string, unknown>;
  const visibility = String(record.visibility || record.documentVisibility || record.access || "").toUpperCase();
  const privateForRole = String(record.privateForRole || record.ownerRole || "").toUpperCase();
  return Boolean(
    record.lawyerPrivate ||
      record.privateLawyerDocument ||
      record.internalStrategy ||
      record.internal ||
      visibility === "LAWYER_PRIVATE" ||
      visibility === "INTERNAL" ||
      privateForRole === "LAWYER"
  );
}

export function canReadCaseFileRecord(user: FileAccessUser, legalCase: CaseLite) {
  if (user.role === "ADMIN") return true;
  if (user.role === "CLIENT") {
    return Boolean(user.clientProfile && legalCase.clientProfileId === user.clientProfile.id);
  }
  if (user.role === "LAWYER") {
    return Boolean(
      user.lawyerProfile &&
        (legalCase.lawyerOwnerProfileId === user.lawyerProfile.id ||
          legalCase.hasAcceptedAssignment ||
          legalCase.acceptedLawyerProfileIds?.includes(user.lawyerProfile.id))
    );
  }
  return false;
}

export function canReadDocumentFileRecord(
  user: FileAccessUser,
  document: {
    uploadedById: string;
    sourceType: string;
    metadata: MetadataLike;
    case: CaseLite;
  }
) {
  if (isInactiveFileMetadata(document.metadata)) return false;
  if (!canReadCaseFileRecord(user, document.case)) return false;
  if (user.role === "CLIENT" && isLawyerPrivateMetadata(document.metadata)) return false;
  return true;
}

export function canReadExportBundleRecord(
  user: FileAccessUser,
  bundle: {
    createdById: string;
    includePrivateNotes: boolean;
    metadata: MetadataLike;
    case: CaseLite;
  }
) {
  if (isInactiveFileMetadata(bundle.metadata)) return false;
  if (!canReadCaseFileRecord(user, bundle.case)) return false;
  if (user.role === "CLIENT" && (bundle.includePrivateNotes || isLawyerPrivateMetadata(bundle.metadata))) return false;
  return true;
}

export function contentDisposition(fileName: string, download: boolean) {
  const safeAsciiName = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "");
  const encodedName = encodeURIComponent(fileName);
  return `${download ? "attachment" : "inline"}; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`;
}

export async function buildFileResponse(input: {
  bytes: Buffer;
  fileName: string;
  mimeType?: string | null;
  download: boolean;
}) {
  return new NextResponse(new Uint8Array(input.bytes), {
    headers: {
      "Content-Disposition": contentDisposition(input.fileName, input.download),
      "Content-Length": String(input.bytes.byteLength),
      "Content-Type": input.mimeType || "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function getAuthorizedDocumentFile(user: AppUser, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      case: buildAccessibleCaseWhereForUser(user)
    },
    include: {
      case: {
        select: {
          id: true,
          clientProfileId: true,
          lawyerOwnerProfileId: true,
          origin: true
        }
      }
    }
  });

  if (!document) return null;
  const record = {
    ...document,
    case: {
      ...document.case,
      hasAcceptedAssignment: user.role === "LAWYER"
    }
  };
  if (!canReadDocumentFileRecord(user, record)) return null;
  return document;
}

export async function getAuthorizedExportBundleFile(user: AppUser, bundleId: string) {
  const bundle = await prisma.exportBundle.findFirst({
    where: {
      id: bundleId,
      case: buildAccessibleCaseWhereForUser(user)
    },
    include: {
      case: {
        select: {
          id: true,
          clientProfileId: true,
          lawyerOwnerProfileId: true,
          origin: true
        }
      }
    }
  });

  if (!bundle) return null;
  const record = {
    ...bundle,
    case: {
      ...bundle.case,
      hasAcceptedAssignment: user.role === "LAWYER"
    }
  };
  if (!canReadExportBundleRecord(user, record)) return null;
  return bundle;
}

export async function getAuthorizedRedactionFile(user: AppUser, jobId: string) {
  const job = await prisma.redactionJob.findFirst({
    where: {
      id: jobId,
      case: buildAccessibleCaseWhereForUser(user)
    },
    include: {
      case: {
        select: {
          id: true,
          clientProfileId: true,
          lawyerOwnerProfileId: true,
          origin: true
        }
      },
      document: {
        select: {
          uploadedById: true,
          sourceType: true,
          metadata: true,
          case: {
            select: {
              id: true,
              clientProfileId: true,
              lawyerOwnerProfileId: true,
              origin: true
            }
          }
        }
      }
    }
  });

  if (!job || job.status !== "COMPLETED" || !job.outputPath) return null;
  const caseRecord = {
    ...job.case,
    hasAcceptedAssignment: user.role === "LAWYER"
  };
  const documentRecord = {
    ...job.document,
    case: {
      ...job.document.case,
      hasAcceptedAssignment: user.role === "LAWYER"
    }
  };
  if (!canReadCaseFileRecord(user, caseRecord)) return null;
  if (!canReadDocumentFileRecord(user, documentRecord)) return null;
  return job;
}

async function fetchBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to read stored file.");
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function readStoredFileBytes(input: {
  filePath: string;
  storageKey?: string | null;
  metadata?: MetadataLike;
  fileName?: string;
}) {
  if (/^https?:\/\//i.test(input.filePath)) {
    try {
      return await fetchBytes(input.filePath);
    } catch (error) {
      const cloudinaryMeta = getCloudinaryStorageMeta(input.metadata);
      if (!cloudinaryMeta?.publicId) throw error;

      const fallbackUrl = buildCloudinaryDownloadUrl({
        publicId: cloudinaryMeta.publicId,
        resourceType: cloudinaryMeta.resourceType,
        format: input.fileName?.split(".").pop()?.trim().toLowerCase(),
        deliveryType: cloudinaryMeta.deliveryType
      });

      if (!fallbackUrl) throw error;
      return fetchBytes(fallbackUrl);
    }
  }

  const resolved = resolveStoredLocalPath(input.filePath, input.storageKey);
  if (!resolved) throw new Error("Not found");
  return fs.readFile(resolved);
}

export async function readAuthorizedStoredFile(input: {
  filePath: string;
  storageKey?: string | null;
  metadata?: MetadataLike;
  fileName?: string;
}) {
  return readStoredFileBytes(input);
}

export async function unlinkStoredLocalFile(filePath?: string | null, storageKey?: string | null) {
  if (!filePath) return false;
  const resolved = resolveStoredLocalPath(filePath, storageKey);
  if (!resolved) return false;
  await fs.unlink(resolved);
  return true;
}
