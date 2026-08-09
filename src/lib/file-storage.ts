import { getCloudinaryStorageBucket, isCloudinaryConfigured, uploadToCloudinary } from "@/lib/cloudinary-storage";
import { recordStorageMetric } from "@/lib/observability";
import { writeSecureFile } from "@/lib/secure-file-core";

export async function saveUploadedFile(file: File, fileBuffer?: Buffer) {
  if (isCloudinaryConfigured()) {
    const startedAt = Date.now();
    const uploaded = await uploadToCloudinary(file);
    recordStorageMetric("document.save.cloudinary", true, {
      bytes: file.size,
      mimeType: file.type,
      durationMs: Date.now() - startedAt
    });

    return {
      fileName: file.name,
      absolutePath: uploaded.secure_url,
      publicPath: uploaded.secure_url,
      storageProvider: "cloudinary",
      storageBucket: getCloudinaryStorageBucket(),
      storageKey: uploaded.public_id,
      storageUrl: uploaded.secure_url,
      metadata: {
        storageProvider: "cloudinary",
        bucket: getCloudinaryStorageBucket(),
        storageKey: uploaded.public_id,
        assetId: uploaded.asset_id,
        publicId: uploaded.public_id,
        version: uploaded.version,
        versionId: uploaded.version_id,
        resourceType: uploaded.resource_type,
        type: uploaded.type,
        format: uploaded.format,
        bytes: uploaded.bytes,
        width: uploaded.width,
        height: uploaded.height,
        pages: uploaded.pages,
        originalFilename: uploaded.original_filename,
        secureUrl: uploaded.secure_url
      }
    };
  }

  const buffer = fileBuffer || Buffer.from(await file.arrayBuffer());
  const target = await writeSecureFile("uploads", file.name, buffer);
  recordStorageMetric("document.save.local", true, {
    bytes: file.size,
    mimeType: file.type
  });

  return {
    fileName: file.name,
    absolutePath: target.absolutePath,
    publicPath: target.filePath,
    storageProvider: "local",
    storageBucket: target.storageBucket,
    storageKey: target.storageKey,
    storageUrl: null,
    metadata: {
      storageProvider: "local",
      bucket: target.storageBucket,
      storageKey: target.storageKey,
      privatePath: target.filePath
    }
  };
}
