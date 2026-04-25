import fs from "node:fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export async function extractTextFromFile(filePath: string, mimeType: string) {
  const buffer = await fs.readFile(filePath);

  if (mimeType === "application/pdf") {
    const parsed = await pdf(buffer);
    return parsed.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType.startsWith("text/")) {
    return buffer.toString("utf8");
  }

  return "";
}
