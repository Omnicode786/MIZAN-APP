import crypto from "node:crypto";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

type CloudinaryUploadResponse = {
  asset_id?: string;
  public_id: string;
  version?: number;
  version_id?: string;
  signature?: string;
  width?: number;
  height?: number;
  format?: string;
  resource_type: string;
  created_at?: string;
  bytes?: number;
  type?: string;
  etag?: string;
  url?: string;
  secure_url: string;
  original_filename?: string;
  pages?: number;
};

export type CloudinaryStorageMeta = {
  publicId: string;
  resourceType: string;
  format?: string;
  deliveryType: string;
  secureUrl?: string;
};

function inferResourceType(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "raw";
}

function normalizeCloudinaryUrl(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  const marker = "CLOUDINARY_URL=";
  const markerIndex = trimmed.indexOf(marker);
  return markerIndex >= 0 ? trimmed.slice(markerIndex + marker.length) : trimmed;
}

function getCloudinaryConfig(): CloudinaryConfig | null {
  const rawUrl = normalizeCloudinaryUrl(process.env.CLOUDINARY_URL || process.env.VITE_CLOUDINARY_UPLOAD_URL);
  let fromUrl: Partial<CloudinaryConfig> = {};

  if (rawUrl.startsWith("cloudinary://")) {
    try {
      const parsed = new URL(rawUrl);
      fromUrl = {
        apiKey: decodeURIComponent(parsed.username),
        apiSecret: decodeURIComponent(parsed.password),
        cloudName: parsed.hostname
      };
    } catch (error) {
      console.error("Invalid CLOUDINARY_URL.", error);
    }
  }

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.VITE_CLOUDINARY_CLOUD_NAME ||
    fromUrl.cloudName;
  const apiKey = process.env.CLOUDINARY_API_KEY || fromUrl.apiKey;
  const apiSecret =
    process.env.CLOUDINARY_API_SECRET ||
    process.env.API_SECRET ||
    process.env.API_Secret ||
    fromUrl.apiSecret;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "mizan/uploads"
  };
}

function signParams(params: Record<string, string | number | boolean>, apiSecret: string) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function buildUploadParams(config: CloudinaryConfig) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    folder: config.folder,
    overwrite: false,
    timestamp,
    unique_filename: true,
    use_filename: true
  };

  return {
    ...params,
    api_key: config.apiKey,
    signature: signParams(params, config.apiSecret)
  };
}

export function isCloudinaryConfigured() {
  return Boolean(getCloudinaryConfig());
}

export function getCloudinaryStorageMeta(metadata: unknown): CloudinaryStorageMeta | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const storage = (metadata as any).storage || metadata;
  if (!storage || typeof storage !== "object" || storage.storageProvider !== "cloudinary") {
    return null;
  }

  return {
    publicId: typeof storage.publicId === "string" ? storage.publicId : "",
    resourceType: typeof storage.resourceType === "string" ? storage.resourceType : "raw",
    format: typeof storage.format === "string" ? storage.format : undefined,
    deliveryType: typeof storage.type === "string" ? storage.type : "upload",
    secureUrl: typeof storage.secureUrl === "string" ? storage.secureUrl : undefined
  };
}

export function buildCloudinaryDownloadUrl({
  publicId,
  resourceType = "raw",
  format,
  deliveryType = "upload",
  attachment = false,
  expiresInSeconds = 300
}: {
  publicId: string;
  resourceType?: string;
  format?: string;
  deliveryType?: string;
  attachment?: boolean;
  expiresInSeconds?: number;
}) {
  const config = getCloudinaryConfig();
  if (!config || !publicId) {
    return "";
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number | boolean> = {
    public_id: publicId,
    timestamp,
    type: deliveryType
  };

  if (format) {
    params.format = format;
  }

  if (attachment) {
    params.attachment = true;
  }

  if (expiresInSeconds > 0) {
    params.expires_at = timestamp + expiresInSeconds;
  }

  const signature = signParams(params, config.apiSecret);
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });
  searchParams.set("signature", signature);
  searchParams.set("api_key", config.apiKey);

  return `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/download?${searchParams.toString()}`;
}

export async function uploadToCloudinary(file: File) {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error("Cloudinary is not configured.");
  }

  const resourceType = inferResourceType(file.type || "application/octet-stream");
  const form = new FormData();
  const params = buildUploadParams(config);

  form.append("file", file, file.name);
  Object.entries(params).forEach(([key, value]) => {
    form.append(key, String(value));
  });

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: form
  });

  const body = await response.text();
  let parsed: CloudinaryUploadResponse | { error?: { message?: string } };

  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = {};
  }

  if (!response.ok || !("secure_url" in parsed)) {
    console.error("Cloudinary upload failed.", {
      status: response.status,
      body
    });
    throw new Error("Cloud upload failed.");
  }

  return parsed as CloudinaryUploadResponse;
}

export async function deleteFromCloudinary(publicId: string, resourceType = "raw") {
  const config = getCloudinaryConfig();
  if (!config || !publicId) {
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    invalidate: true,
    public_id: publicId,
    timestamp
  };

  const form = new FormData();
  form.append("api_key", config.apiKey);
  form.append("public_id", publicId);
  form.append("timestamp", String(timestamp));
  form.append("invalidate", "true");
  form.append("signature", signParams(params, config.apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`, {
    method: "POST",
    body: form
  });

  if (!response.ok) {
    console.error("Cloudinary delete failed.", {
      status: response.status,
      body: await response.text()
    });
  }
}
