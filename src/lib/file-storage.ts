import fs from "node:fs/promises";
import path from "node:path";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/cloudinary-storage";

export async function saveUploadedFile(file: File, fileBuffer?: Buffer) {
  if (isCloudinaryConfigured()) {
    const uploaded = await uploadToCloudinary(file);

    return {
      fileName: file.name,
      absolutePath: uploaded.secure_url,
      publicPath: uploaded.secure_url,
      metadata: {
        storageProvider: "cloudinary",
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
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const absolutePath = path.join(uploadDir, safeName);
  await fs.writeFile(absolutePath, buffer);

  return {
    fileName: file.name,
    absolutePath,
    publicPath: `/uploads/${safeName}`,
    metadata: {
      storageProvider: "local",
      publicPath: `/uploads/${safeName}`
    }
  };
}
