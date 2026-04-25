import fs from "node:fs/promises";
import path from "node:path";

export async function saveUploadedFile(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const absolutePath = path.join(uploadDir, safeName);
  await fs.writeFile(absolutePath, buffer);

  return {
    fileName: file.name,
    absolutePath,
    publicPath: `/uploads/${safeName}`
  };
}
