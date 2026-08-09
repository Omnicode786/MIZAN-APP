import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { buildCloudinaryDownloadUrl, getCloudinaryStorageMeta } from "@/lib/cloudinary-storage";

const SECURE_SCHEME = "secure://";
const SECURE_ROOT_NAME = ".mizan-secure-files";
const LEGACY_PUBLIC_ROOTS = ["uploads", "exports", "redactions"] as const;

type FileArea = (typeof LEGACY_PUBLIC_ROOTS)[number] | "legacy";
type MetadataLike = Prisma.JsonValue | unknown;

type CaseLite = {
  id: string;
  clientProfileId: string | null;
  lawyerOwnerProfileId?: string | null;
  origin?: string | null;
  hasAcceptedAssignment?: boolean;
  acceptedLawyerProfileIds?: string[];
};

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
  if (normalizedPath === normalizedRoot || normalizedPath.startsWith(normalizedRoot + path.sep)) return normalizedPath;
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
  return assertInsideRoot(path.resolve(getSecureFileRoot(), relativePath), getSecureFileRoot());
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
  if (user.role === "CLIENT") return Boolean(user.clientProfile && legalCase.clientProfileId === user.clientProfile.id);
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

async function fetchBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to read stored file.");
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

export async function unlinkStoredLocalFile(filePath?: string | null, storageKey?: string | null) {
  if (!filePath) return false;
  const resolved = resolveStoredLocalPath(filePath, storageKey);
  if (!resolved) return false;
  await fs.unlink(resolved);
  return true;
}
