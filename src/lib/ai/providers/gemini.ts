type GeminiResult = {
  text: string;
  confidence: number;
  provider: "gemini";
  contextPreview?: string;
};
type AiTaskOptions = {
  maxOutputTokens?: number;
  temperature?: number;
};

function envValue(value: string | undefined, fallback: string) {
  const normalized = (value || "").trim().replace(/^["']|["']$/g, "");
  return normalized || fallback;
}

function envApiKey(value: string | undefined) {
  return (value || "").trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
}

function isRetryableStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(parts: any[], options: AiTaskOptions = {}): Promise<GeminiResult> {
  const apiKey = envApiKey(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const model = envValue(process.env.GEMINI_MODEL, "gemini-2.5-flash");
  if (!model) {
    throw new Error("Gemini model is not configured.");
  }

  if (!Array.isArray(parts) || !parts.length) {
    throw new Error("Gemini prompt is empty.");
  }

  const hasText = parts.some((part) => typeof part?.text === "string" && part.text.trim().length > 0);
  if (!hasText) {
    throw new Error("Gemini prompt is empty.");
  }

  let response: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: options.temperature ?? 0.25,
            topP: 0.9,
            maxOutputTokens: options.maxOutputTokens ?? 4096
          }
        })
      }
    );

    if (response.ok || !isRetryableStatus(response.status) || attempt === 2) break;
    await wait(650 * (attempt + 1));
  }

  if (!response) {
    throw new Error("Gemini request did not return a response.");
  }

  if (!response.ok) {
    const bodyText = await response.text();
    console.error("[GEMINI_PROVIDER_ERROR]", {
      status: response.status,
      model,
      body: bodyText
    });

    throw new Error(`Gemini request failed with ${response.status}.`);
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || "").join("\n").trim() ||
    "No response returned by Gemini.";

  return {
    text,
    confidence: 0.82,
    provider: "gemini"
  };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function generateGeminiInsight(
  prompt: string,
  context?: string,
  options: AiTaskOptions = {}
) {
  if (!prompt.trim()) {
    throw new Error("Gemini prompt is empty.");
  }

  return callGemini([
    {
      text: `${prompt}\n\nWorking context:\n${context || "No extra context supplied."}`
    }
  ], options);
}

export async function generateGeminiVisionInsight(
  prompt: string,
  images: Array<{ mimeType: string; data: string }>,
  context?: string,
  options: AiTaskOptions = {}
) {
  if (!prompt.trim()) {
    throw new Error("Gemini prompt is empty.");
  }

  const validImages = images.filter(
    (image) =>
      typeof image?.mimeType === "string" &&
      image.mimeType.trim().length > 0 &&
      typeof image?.data === "string" &&
      image.data.trim().length > 0
  );

  if (validImages.length !== images.length) {
    throw new Error("Gemini image input is invalid.");
  }

  const parts = [
    {
      text: `${prompt}\n\nWorking context:\n${context || "No extra context supplied."}`
    },
    ...validImages.map((image) => ({
      inline_data: {
        mime_type: image.mimeType,
        data: image.data
      }
    }))
  ];

  return callGemini(parts, options);
}
