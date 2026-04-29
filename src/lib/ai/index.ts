import { generateGeminiInsight, generateGeminiVisionInsight } from "@/lib/ai/providers/gemini";
import { generateMockInsight, generateMockVisionInsight } from "@/lib/ai/providers/mock";
import { generateOpenAIInsight, generateOpenAIVisionInsight } from "@/lib/ai/providers/openai";
import { assertAiUsageAvailable } from "@/lib/ai-usage";
import { recordAiUsage, trackError } from "@/lib/observability";

type AiProvider = "gemini" | "openai" | "mock";
type AiTaskOptions = {
  maxOutputTokens?: number;
  temperature?: number;
  feature?: string;
  userId?: string;
  caseId?: string;
  documentId?: string;
};

export class AiProviderError extends Error {
  provider: AiProvider;

  constructor(provider: AiProvider, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : "Unknown provider error";
    super(`AI provider "${provider}" failed: ${detail}`);
    this.name = "AiProviderError";
    this.provider = provider;
  }
}

function normalizeProvider(value: string | undefined): AiProvider {
  const provider = (value || "gemini").trim().replace(/^["']|["']$/g, "").toLowerCase();
  if (provider === "mock" && canUseMockProvider()) return "mock";
  if (provider === "openai" || provider === "gemini") return provider;
  return "gemini";
}

function canUseMockProvider() {
  const enabled = (process.env.AI_ENABLE_MOCK_PROVIDER || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();

  return process.env.NODE_ENV === "test" || enabled === "true";
}

function providerModel(provider: AiProvider) {
  if (provider === "openai") return (process.env.OPENAI_MODEL || "gpt-4.1-mini").trim().replace(/^["']|["']$/g, "");
  if (provider === "gemini") return (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim().replace(/^["']|["']$/g, "");
  return "mock";
}

function withoutExtraWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function rejectPromptEcho<T extends { text: string }>(result: T, prompt: string): T {
  const text = withoutExtraWhitespace(result.text);
  const promptStart = withoutExtraWhitespace(prompt).slice(0, 140);
  const markers = [
    "You are MIZAN's Pakistani legal workflow assistant.",
    "You are acting as opposing counsel in a timed legal debate.",
    "You are evaluating a lawyer-versus-AI debate after time expired.",
    "Translate the supplied legal-tech content into the target language.",
    "Pakistan-law context:",
    "Grounded case/document context:",
    "Working context:"
  ];

  if (
    (promptStart.length > 80 && text.includes(promptStart)) ||
    markers.some((marker) => prompt.includes(marker) && result.text.includes(marker))
  ) {
    throw new Error("AI response echoed internal prompt instructions.");
  }

  return result;
}

export async function runAiTask(prompt: string, context?: string, options?: AiTaskOptions) {
  const provider = normalizeProvider(process.env.AI_PROVIDER);
  const model = providerModel(provider);
  const startedAt = Date.now();
  if (!prompt.trim()) {
    throw new AiProviderError(provider, new Error("AI prompt is empty."));
  }

  if (options?.userId) {
    await assertAiUsageAvailable(options.userId);
  }

  try {
    let result;
    if (provider === "openai") {
      result = rejectPromptEcho(await generateOpenAIInsight(prompt, context, options), prompt);
    } else if (provider === "gemini") {
      result = rejectPromptEcho(await generateGeminiInsight(prompt, context, options), prompt);
    } else {
      result = await generateMockInsight(prompt, context);
    }

    recordAiUsage({
      provider,
      model,
      feature: options?.feature,
      userId: options?.userId,
      caseId: options?.caseId,
      documentId: options?.documentId,
      prompt,
      context,
      output: result.text,
      durationMs: Date.now() - startedAt,
      success: true
    });

    return result;
  } catch (error) {
    recordAiUsage({
      provider,
      model,
      feature: options?.feature,
      userId: options?.userId,
      caseId: options?.caseId,
      documentId: options?.documentId,
      prompt,
      context,
      durationMs: Date.now() - startedAt,
      success: false
    });
    trackError("ai.provider", error, { provider, model });
    throw new AiProviderError(provider, error);
  }
}

export async function runVisionAiTask(
  prompt: string,
  images: Array<{ mimeType: string; data: string }>,
  context?: string,
  options?: AiTaskOptions
) {
  const provider = normalizeProvider(process.env.AI_PROVIDER);
  const model = providerModel(provider);
  const startedAt = Date.now();
  if (!prompt.trim()) {
    throw new AiProviderError(provider, new Error("AI prompt is empty."));
  }

  if (!Array.isArray(images) || images.some((image) => !image?.mimeType || !image?.data)) {
    throw new AiProviderError(provider, new Error("AI image input is invalid."));
  }

  if (options?.userId) {
    await assertAiUsageAvailable(options.userId);
  }

  try {
    let result;
    if (provider === "openai") result = rejectPromptEcho(await generateOpenAIVisionInsight(prompt, images, context, options), prompt);
    else if (provider === "gemini") result = rejectPromptEcho(await generateGeminiVisionInsight(prompt, images, context, options), prompt);
    else result = await generateMockVisionInsight(prompt, images, context);

    recordAiUsage({
      provider,
      model,
      feature: options?.feature || "vision",
      userId: options?.userId,
      caseId: options?.caseId,
      documentId: options?.documentId,
      prompt,
      context,
      output: result.text,
      durationMs: Date.now() - startedAt,
      success: true
    });

    return result;
  } catch (error) {
    recordAiUsage({
      provider,
      model,
      feature: options?.feature || "vision",
      userId: options?.userId,
      caseId: options?.caseId,
      documentId: options?.documentId,
      prompt,
      context,
      durationMs: Date.now() - startedAt,
      success: false
    });
    trackError("ai.vision_provider", error, { provider, model });
    throw new AiProviderError(provider, error);
  }
}
