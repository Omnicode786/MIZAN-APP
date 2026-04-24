export async function generateMockInsight(prompt: string, context?: string) {
  const snippet = context?.slice(0, 500) || "No uploaded evidence context was provided.";
  return {
    text: `Assistive legal analysis based on the available record:\n\n${prompt.slice(0, 240)}\n\nGrounded context preview: ${snippet}`,
    confidence: 0.67,
    provider: "mock" as const,
    contextPreview: snippet
  };
}

export async function generateMockVisionInsight(
  prompt: string,
  _images: Array<{ mimeType: string; data: string }>,
  context?: string
) {
  return generateMockInsight(prompt, context);
}
