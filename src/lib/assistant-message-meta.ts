export type AssistantActionMeta = {
  tool?: string;
  title: string;
  message: string;
  status?: "success" | "info" | "error";
  action?: {
    type: string;
    label: string;
    href?: string;
  };
};

export type AssistantCasePreviewMeta = {
  tool: "create_case";
  status: "pending_confirmation";
  arguments: Record<string, unknown>;
  title?: string;
  createdAt?: string;
};

const ACTION_META_PATTERN = /<!--MIZAN_ACTION:([\s\S]*?)-->/;
const ACTION_META_STRIP_PATTERN = /<!--MIZAN_ACTION:[\s\S]*?-->/g;
const CASE_PREVIEW_META_PATTERN = /<!--MIZAN_CASE_PREVIEW:([\s\S]*?)-->/;
const CASE_PREVIEW_META_STRIP_PATTERN = /<!--MIZAN_CASE_PREVIEW:[\s\S]*?-->/g;

export function appendAssistantActionMeta(content: string, meta?: AssistantActionMeta | null) {
  const cleanContent = stripAssistantActionMeta(content || "");

  if (!meta) {
    return cleanContent;
  }

  const encoded = encodeURIComponent(JSON.stringify(meta));
  return `${cleanContent}\n\n<!--MIZAN_ACTION:${encoded}-->`;
}

export function appendAssistantCasePreviewMeta(
  content: string,
  meta?: AssistantCasePreviewMeta | null
) {
  const cleanContent = stripAssistantActionMeta(content || "");

  if (!meta) {
    return cleanContent;
  }

  const encoded = encodeURIComponent(JSON.stringify(meta));
  return `${cleanContent}\n\n<!--MIZAN_CASE_PREVIEW:${encoded}-->`;
}

export function extractAssistantActionMeta(content: string) {
  const match = content.match(ACTION_META_PATTERN);
  if (!match?.[1]) {
    return null;
  }

  try {
    const raw = decodeURIComponent(match[1]);
    const parsed = JSON.parse(raw) as AssistantActionMeta;

    if (!parsed || typeof parsed !== "object" || typeof parsed.title !== "string" || typeof parsed.message !== "string") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function extractAssistantCasePreviewMeta(content: string) {
  const match = content.match(CASE_PREVIEW_META_PATTERN);
  if (!match?.[1]) {
    return null;
  }

  try {
    const raw = decodeURIComponent(match[1]);
    const parsed = JSON.parse(raw) as AssistantCasePreviewMeta;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.tool !== "create_case" ||
      parsed.status !== "pending_confirmation" ||
      !parsed.arguments ||
      typeof parsed.arguments !== "object"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function stripAssistantActionMeta(content: string) {
  return content
    .replace(ACTION_META_STRIP_PATTERN, "")
    .replace(CASE_PREVIEW_META_STRIP_PATTERN, "")
    .trim();
}
