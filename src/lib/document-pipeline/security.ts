import crypto from "node:crypto";

export type UploadScanStatus = "CLEAN" | "INFECTED" | "FAILED" | "SKIPPED";

export type UploadScanResult = {
  status: UploadScanStatus;
  allowed: boolean;
  checkedAt: Date;
  message?: string;
  metadata?: Record<string, unknown>;
};

export function sha256Buffer(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function validateUploadSignature(buffer: Buffer, mimeType: string) {
  if (!buffer.byteLength) {
    return { ok: false, message: "File is empty." };
  }

  const hex = buffer.subarray(0, 16).toString("hex").toLowerCase();
  const ascii = buffer.subarray(0, 16).toString("latin1");

  const checks: Array<[boolean, boolean, string]> = [
    [mimeType === "application/pdf", ascii.startsWith("%PDF-"), "PDF file signature does not match its MIME type."],
    [mimeType === "image/png", hex.startsWith("89504e470d0a1a0a"), "PNG file signature does not match its MIME type."],
    [mimeType === "image/jpeg", hex.startsWith("ffd8ff"), "JPEG file signature does not match its MIME type."],
    [mimeType === "image/webp", ascii.startsWith("RIFF") && buffer.subarray(8, 12).toString("latin1") === "WEBP", "WEBP file signature does not match its MIME type."],
    [
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ascii.startsWith("PK"),
      "DOCX file signature does not match its MIME type."
    ],
    [mimeType === "application/msword", hex.startsWith("d0cf11e0a1b11ae1"), "DOC file signature does not match its MIME type."]
  ];

  for (const [shouldCheck, passed, message] of checks) {
    if (shouldCheck && !passed) {
      return { ok: false, message };
    }
  }

  return { ok: true };
}

export async function scanUploadedFile(
  buffer: Buffer,
  input: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    fileHash: string;
  }
): Promise<UploadScanResult> {
  const checkedAt = new Date();
  const scannerUrl = (process.env.VIRUS_SCAN_ENDPOINT || "").trim();

  if (!scannerUrl) {
    return {
      status: "SKIPPED",
      allowed: true,
      checkedAt,
      message: "No virus scanner endpoint is configured.",
      metadata: { scannerConfigured: false }
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.VIRUS_SCAN_TIMEOUT_MS || 10000));

  try {
    const response = await fetch(scannerUrl, {
      method: "POST",
      headers: {
        "Content-Type": input.mimeType || "application/octet-stream",
        "X-File-Name": encodeURIComponent(input.fileName),
        "X-File-Hash": input.fileHash,
        "X-File-Size": String(input.sizeBytes)
      },
      body: new Blob([new Uint8Array(buffer)]),
      signal: controller.signal
    });

    const body = await response.text();
    let parsed: any = {};

    try {
      parsed = body ? JSON.parse(body) : {};
    } catch {
      parsed = { raw: body };
    }

    if (!response.ok) {
      return {
        status: "FAILED",
        allowed: false,
        checkedAt,
        message: "Virus scanner rejected or failed this scan.",
        metadata: { scannerConfigured: true, status: response.status, response: parsed }
      };
    }

    const verdict = String(parsed.status || parsed.verdict || "").toLowerCase();
    if (["infected", "malicious", "unsafe", "blocked"].includes(verdict)) {
      return {
        status: "INFECTED",
        allowed: false,
        checkedAt,
        message: parsed.message || "Virus scanner marked this file as unsafe.",
        metadata: { scannerConfigured: true, response: parsed }
      };
    }

    return {
      status: "CLEAN",
      allowed: true,
      checkedAt,
      message: parsed.message || "Virus scanner marked this file as clean.",
      metadata: { scannerConfigured: true, response: parsed }
    };
  } catch (error) {
    return {
      status: "FAILED",
      allowed: false,
      checkedAt,
      message: error instanceof Error ? error.message : "Virus scanner failed.",
      metadata: { scannerConfigured: true }
    };
  } finally {
    clearTimeout(timeout);
  }
}
