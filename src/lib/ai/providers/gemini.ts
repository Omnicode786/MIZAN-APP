type GeminiResult = {
  text: string;
  confidence: number;
  provider: "gemini";
  contextPreview?: string;
};

function envValue(value: string | undefined, fallback: string) {
  return (value || fallback).trim().replace(/^["']|["']$/g, "");
}

function isRetryableStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(parts: any[]): Promise<GeminiResult> {
  const apiKey = envValue(process.env.GEMINI_API_KEY, "");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const model = envValue(process.env.GEMINI_MODEL, "gemini-2.5-flash");
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
            temperature: 0.25,
            topP: 0.9,
            maxOutputTokens: 1800
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
    throw new Error(`Gemini request failed with ${response.status}`);
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

export async function generateGeminiInsight(prompt: string, context?: string) {
  return callGemini([
    {
      text: `${prompt}\n\nWorking context:\n${context || "No extra context supplied."}`
    }
  ]);
}

export async function generateGeminiVisionInsight(
  prompt: string,
  images: Array<{ mimeType: string; data: string }>,
  context?: string
) {
  const parts = [
    {
      text: `${prompt}\n\nWorking context:\n${context || "No extra context supplied."}`
    },
    ...images.map((image) => ({
      inline_data: {
        mime_type: image.mimeType,
        data: image.data
      }
    }))
  ];

  return callGemini(parts);
}
