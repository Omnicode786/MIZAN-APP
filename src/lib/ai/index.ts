import { generateGeminiInsight, generateGeminiVisionInsight } from "@/lib/ai/providers/gemini";
import { generateMockInsight, generateMockVisionInsight } from "@/lib/ai/providers/mock";
import { generateOpenAIInsight, generateOpenAIVisionInsight } from "@/lib/ai/providers/openai";

export async function runAiTask(prompt: string, context?: string) {
  const provider = process.env.AI_PROVIDER || "gemini";

  try {
    if (provider === "openai") return await generateOpenAIInsight(prompt, context);
    if (provider === "gemini") return await generateGeminiInsight(prompt, context);
    return await generateMockInsight(prompt, context);
  } catch {
    return generateMockInsight(prompt, context);
  }
}

export async function runVisionAiTask(
  prompt: string,
  images: Array<{ mimeType: string; data: string }>,
  context?: string
) {
  const provider = process.env.AI_PROVIDER || "gemini";

  try {
    if (provider === "openai") return await generateOpenAIVisionInsight(prompt, images, context);
    if (provider === "gemini") return await generateGeminiVisionInsight(prompt, images, context);
    return await generateMockVisionInsight(prompt, images, context);
  } catch {
    return generateMockVisionInsight(prompt, images, context);
  }
}
