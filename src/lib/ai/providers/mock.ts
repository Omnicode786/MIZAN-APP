export async function generateMockInsight(prompt: string, context?: string) {
  const snippet = cleanSnippet(context) || "No uploaded evidence context was provided.";
  const question = extractVisibleQuestion(prompt);

  return {
    text: [
      "Assistive legal analysis based on the available record:",
      "",
      "1) Position",
      `The file appears to concern ${question}. The answer should be checked against the uploaded documents, case status, and any Pakistan-law provisions matched in the workspace.`,
      "",
      "2) Why it matters",
      "The current record is useful for identifying the legal issue, but a lawyer should confirm the facts, dates, parties, and procedural route before relying on it.",
      "",
      "3) Evidence gaps",
      "Confirm the complete document set, proof of delivery or attendance where relevant, communications between the parties, dates, and any signed acknowledgements.",
      "",
      "4) Suggested next steps",
      "Collect the missing documents, organize the timeline, mark the strongest evidence, and ask counsel to decide whether the matter needs a notice, complaint, negotiation, or further review.",
      "",
      "5) Caution",
      `AI provider fallback is active, so this is a limited workspace response rather than a live model answer. Context preview: ${snippet}`
    ].join("\n"),
    confidence: 0.35,
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

function extractVisibleQuestion(prompt: string) {
  const userQuestion = prompt.match(/User question:\s*([\s\S]+)$/i)?.[1];
  const content = prompt.match(/Content:\s*([\s\S]+)$/i)?.[1];
  const draftRequest = prompt.match(/Draft a ([\s\S]+?) for this case\./i)?.[0];
  const visible = userQuestion || content || draftRequest || "the supplied legal question";

  return visible
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function cleanSnippet(context?: string) {
  return (context || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}
