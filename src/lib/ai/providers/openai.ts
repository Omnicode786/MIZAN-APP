type OpenAIResult = {
  text: string;
  confidence: number;
  provider: "openai";
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

async function callOpenAI(body: any): Promise<OpenAIResult> {
  const apiKey = envApiKey(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = envValue(process.env.OPENAI_MODEL, "gpt-4.1-mini");
  if (!model) {
    throw new Error("OpenAI model is not configured.");
  }

  let response: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, ...body })
    });

    if (response.ok || !isRetryableStatus(response.status) || attempt === 2) break;
    await wait(650 * (attempt + 1));
  }

  if (!response) {
    throw new Error("OpenAI request did not return a response.");
  }

  if (!response.ok) {
    const bodyText = await response.text();
    const parsed = safeJsonParse(bodyText);
    const remoteMessage =
      parsed?.error?.message ||
      parsed?.message ||
      "";
    console.error("[OPENAI_PROVIDER_ERROR]", {
      status: response.status,
      model,
      body: bodyText
    });

    throw new Error(
      remoteMessage
        ? `OpenAI request failed with ${response.status}: ${remoteMessage}`
        : `OpenAI request failed with ${response.status}`
    );
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || "No response returned by OpenAI.";

  return {
    text,
    confidence: 0.82,
    provider: "openai"
  };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function generateOpenAIInsight(
  prompt: string,
  context?: string,
  options: AiTaskOptions = {}
) {
  if (!prompt.trim()) {
    throw new Error("OpenAI prompt is empty.");
  }

  return callOpenAI({
    temperature: options.temperature ?? 0.25,
    max_tokens: options.maxOutputTokens ?? 4096,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\nWorking context:\n${context || "No extra context supplied."}`
      }
    ]
  });
}

export async function generateOpenAIVisionInsight(
  prompt: string,
  images: Array<{ mimeType: string; data: string }>,
  context?: string,
  options: AiTaskOptions = {}
) {
  if (!prompt.trim()) {
    throw new Error("OpenAI prompt is empty.");
  }

  const validImages = images.filter(
    (image) =>
      typeof image?.mimeType === "string" &&
      image.mimeType.trim().length > 0 &&
      typeof image?.data === "string" &&
      image.data.trim().length > 0
  );

  if (validImages.length !== images.length) {
    throw new Error("OpenAI image input is invalid.");
  }

  return callOpenAI({
    temperature: options.temperature ?? 0.25,
    max_tokens: options.maxOutputTokens ?? 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${prompt}\n\nWorking context:\n${context || "No extra context supplied."}`
          },
          ...validImages.map((image) => ({
            type: "image_url",
            image_url: {
              url: `data:${image.mimeType};base64,${image.data}`
            }
          }))
        ]
      }
    ]
  });
}
