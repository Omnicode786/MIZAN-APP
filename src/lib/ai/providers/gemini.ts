type GeminiResult = {
  text: string;
  confidence: number;
  provider: "gemini";
  contextPreview?: string;
};

async function callGemini(parts: any[]): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(
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
