import fs from "node:fs/promises";
import path from "node:path";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { runVisionAiTask } from "@/lib/ai";
import { buildCloudinaryDownloadUrl, getCloudinaryStorageMeta } from "@/lib/cloudinary-storage";

type ReadFileOptions = {
  fileName?: string;
  metadata?: unknown;
};

type ExtractionOptions = ReadFileOptions & {
  enableAiOcr?: boolean;
};

export type TextExtractionEngine =
  | "pdf-parse"
  | "mammoth"
  | "plain-text"
  | "html-text"
  | "ai-ocr"
  | "unsupported";

export type TextExtractionResult = {
  text: string;
  engine: TextExtractionEngine;
  warning?: string;
};

const AI_OCR_MAX_BYTES = 18 * 1024 * 1024;
const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function inferFormat(fileName?: string) {
  const extension = fileName?.split(".").pop()?.trim().toLowerCase();
  return extension || undefined;
}

export function inferDocumentMimeType(fileName?: string, mimeType?: string) {
  const normalized = (mimeType || "").trim().toLowerCase();
  if (normalized && normalized !== "application/octet-stream") return normalized;

  const extension = inferFormat(fileName);
  if (extension === "pdf") return PDF_MIME;
  if (extension === "docx") return DOCX_MIME;
  if (extension === "txt") return "text/plain";
  if (extension === "csv") return "text/csv";
  if (extension === "json") return "application/json";
  if (extension === "html" || extension === "htm") return "text/html";
  if (extension === "xml") return "application/xml";
  if (extension === "rtf") return "application/rtf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";

  return normalized || "application/octet-stream";
}

function compact(text: string | null | undefined) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function hasReadableText(text: string | null | undefined) {
  const normalized = compact(text);
  const meaningfulCharacters = normalized.replace(/[^A-Za-z0-9\u0600-\u06FF]/g, "");

  return normalized.length >= 40 && meaningfulCharacters.length >= 20;
}

function decodeText(buffer: Buffer) {
  return buffer.toString("utf8").replace(/^\uFEFF/, "").trim();
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlainTextLike(mimeType: string) {
  return (
    mimeType.startsWith("text/") ||
    [
      "application/json",
      "application/xml",
      "application/rtf",
      "application/csv",
      "text/csv"
    ].includes(mimeType)
  );
}

function canUseAiOcr(mimeType: string) {
  const provider = (process.env.AI_PROVIDER || "gemini").trim().replace(/^["']|["']$/g, "").toLowerCase();
  const mockEnabled =
    process.env.NODE_ENV === "test" ||
    (process.env.AI_ENABLE_MOCK_PROVIDER || "").trim().replace(/^["']|["']$/g, "").toLowerCase() === "true";
  const activeProvider = provider === "mock" && !mockEnabled ? "gemini" : provider;

  if (mimeType.startsWith("image/")) return true;
  return activeProvider === "gemini" && mimeType === PDF_MIME;
}

function cleanAiOcrText(value: string) {
  const cleaned = value
    .replace(/^```(?:text|markdown)?/i, "")
    .replace(/```$/i, "")
    .replace(/\r/g, "")
    .trim();

  if (!cleaned || /^OCR_UNREADABLE$/i.test(cleaned)) return "";
  if (/^(i('|’)m sorry|sorry|i cannot|i can('|’)t|unable to read|no readable text)/i.test(cleaned)) {
    return "";
  }

  return cleaned;
}

async function fetchBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to read uploaded file.");
  }

  return Buffer.from(await response.arrayBuffer());
}

async function readFileBytes(filePath: string, options: ReadFileOptions = {}) {
  if (/^https?:\/\//i.test(filePath)) {
    try {
      return await fetchBytes(filePath);
    } catch (error) {
      const cloudinaryMeta = getCloudinaryStorageMeta(options.metadata);
      if (!cloudinaryMeta?.publicId) throw error;

      const fallbackUrl = buildCloudinaryDownloadUrl({
        publicId: cloudinaryMeta.publicId,
        resourceType: cloudinaryMeta.resourceType,
        format: cloudinaryMeta.format || inferFormat(options.fileName),
        deliveryType: cloudinaryMeta.deliveryType
      });

      if (!fallbackUrl) throw error;
      return fetchBytes(fallbackUrl);
    }
  }

  if (filePath.startsWith("/uploads/")) {
    return fs.readFile(path.join(process.cwd(), "public", filePath));
  }

  return fs.readFile(filePath);
}

async function extractWithAiOcr(
  buffer: Buffer,
  mimeType: string,
  fileName?: string,
  parserWarning?: string
): Promise<TextExtractionResult> {
  if (!canUseAiOcr(mimeType)) {
    return { text: "", engine: "unsupported", warning: parserWarning || "Unsupported document type." };
  }

  if (buffer.byteLength > AI_OCR_MAX_BYTES) {
    return { text: "", engine: "unsupported", warning: "File is too large for OCR fallback." };
  }

  try {
    const response = await runVisionAiTask(
      [
        "Extract OCR text from the attached file for MIZAN's document pipeline.",
        "Return plain text only. Do not summarize, explain, classify, translate, or infer missing words.",
        "Preserve useful line breaks and labels where possible.",
        "If text is unclear, write [illegible] only for that exact area.",
        "If no readable text exists, return exactly OCR_UNREADABLE.",
        fileName ? `File name for reference only, not evidence: ${fileName}` : "No file name supplied."
      ].join("\n"),
      [{ mimeType, data: buffer.toString("base64") }],
      parserWarning ? `Parser warning: ${parserWarning}` : "Parser did not provide readable text.",
      { maxOutputTokens: 8192, temperature: 0 }
    );

    const text = cleanAiOcrText(response.text);
    return {
      text,
      engine: text ? "ai-ocr" : "unsupported",
      warning: text ? parserWarning : parserWarning || "OCR fallback could not read this file."
    };
  } catch (error) {
    console.error("AI OCR extraction failed.", error);
    return { text: "", engine: "unsupported", warning: parserWarning || "OCR fallback failed." };
  }
}

export async function extractTextFromBufferWithDiagnostics(
  buffer: Buffer,
  mimeType: string,
  options: ExtractionOptions = {}
): Promise<TextExtractionResult> {
  const resolvedMimeType = inferDocumentMimeType(options.fileName, mimeType);
  let parserWarning = "";

  if (resolvedMimeType === PDF_MIME) {
    try {
      const parsed = await pdf(buffer);
      const text = (parsed.text || "").trim();
      if (hasReadableText(text)) return { text, engine: "pdf-parse" };
      parserWarning = "PDF parser returned little or no readable text.";
    } catch (error) {
      parserWarning = error instanceof Error ? error.message : "PDF parser failed.";
    }
  } else if (resolvedMimeType === DOCX_MIME) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || "").trim();
      if (hasReadableText(text)) return { text, engine: "mammoth" };
      parserWarning = "DOCX parser returned little or no readable text.";
    } catch (error) {
      parserWarning = error instanceof Error ? error.message : "DOCX parser failed.";
    }
  } else if (resolvedMimeType === "text/html") {
    const text = stripHtml(decodeText(buffer));
    if (hasReadableText(text)) return { text, engine: "html-text" };
    parserWarning = "HTML file did not contain readable text.";
  } else if (isPlainTextLike(resolvedMimeType)) {
    const text = decodeText(buffer);
    if (hasReadableText(text)) return { text, engine: "plain-text" };
    parserWarning = "Text file did not contain readable text.";
  }

  if (options.enableAiOcr) {
    return extractWithAiOcr(buffer, resolvedMimeType, options.fileName, parserWarning);
  }

  return {
    text: "",
    engine: "unsupported",
    warning: parserWarning || `Unsupported document type: ${resolvedMimeType}.`
  };
}

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string, options: ExtractionOptions = {}) {
  const result = await extractTextFromBufferWithDiagnostics(buffer, mimeType, options);
  return result.text;
}

export async function extractTextFromFileWithDiagnostics(
  filePath: string,
  mimeType: string,
  options: ExtractionOptions = {}
) {
  const buffer = await readFileBytes(filePath, options);
  return extractTextFromBufferWithDiagnostics(buffer, mimeType, options);
}

export async function extractTextFromFile(filePath: string, mimeType: string, options: ExtractionOptions = {}) {
  const result = await extractTextFromFileWithDiagnostics(filePath, mimeType, options);
  return result.text;
}

export async function readUploadedFileBytes(filePath: string, options: ReadFileOptions = {}) {
  return readFileBytes(filePath, options);
}
