import { generateGeminiInsight, generateGeminiVisionInsight } from "@/lib/ai/providers/gemini";
import { generateMockInsight, generateMockVisionInsight } from "@/lib/ai/providers/mock";
import { generateOpenAIInsight, generateOpenAIVisionInsight } from "@/lib/ai/providers/openai";

type AiProvider = "gemini" | "openai" | "mock";
type AiTaskOptions = {
  maxOutputTokens?: number;
  temperature?: number;
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
  if (provider === "openai" || provider === "gemini" || provider === "mock") return provider;
  return "gemini";
}

function allowMockFallback(provider: AiProvider) {
  const configured = (process.env.AI_ALLOW_MOCK_FALLBACK || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();

  return provider === "mock" || configured === "true";
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
  if (!prompt.trim()) {
    throw new AiProviderError(provider, new Error("AI prompt is empty."));
  }

  try {
    if (provider === "openai") {
      return rejectPromptEcho(await generateOpenAIInsight(prompt, context, options), prompt);
    }
    if (provider === "gemini") {
      return rejectPromptEcho(await generateGeminiInsight(prompt, context, options), prompt);
    }
    return await generateMockInsight(prompt, context);
  } catch (error) {
    console.error(`AI provider "${provider}" failed.`, error);
    if (allowMockFallback(provider)) return generateMockInsight(prompt, context);
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
  if (!prompt.trim()) {
    throw new AiProviderError(provider, new Error("AI prompt is empty."));
  }

  if (!Array.isArray(images) || images.some((image) => !image?.mimeType || !image?.data)) {
    throw new AiProviderError(provider, new Error("AI image input is invalid."));
  }

  try {
    if (provider === "openai") return rejectPromptEcho(await generateOpenAIVisionInsight(prompt, images, context, options), prompt);
    if (provider === "gemini") return rejectPromptEcho(await generateGeminiVisionInsight(prompt, images, context, options), prompt);
    return await generateMockVisionInsight(prompt, images, context);
  } catch (error) {
    console.error(`Vision AI provider "${provider}" failed.`, error);
    if (allowMockFallback(provider)) return generateMockVisionInsight(prompt, images, context);
    throw new AiProviderError(provider, error);
  }
}
