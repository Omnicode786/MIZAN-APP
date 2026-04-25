export async function generateMockInsight(prompt: string, context?: string) {
  const snippet = cleanSnippet(context) || "No uploaded evidence context was provided.";
  const question = extractVisibleQuestion(prompt);

  return {
    text: [
      "## Position",
      "",
      `The file appears to concern ${question}. The answer should be checked against the uploaded documents, case status, and any Pakistan-law provisions matched in the workspace.`,
      "",
      "## Why It Matters",
      "",
      "The current record is useful for identifying the legal issue, but a lawyer should confirm the facts, dates, parties, and procedural route before relying on it.",
      "",
      "## Evidence Gaps",
      "",
      "- Confirm the complete document set.",
      "- Confirm proof of delivery or attendance where relevant.",
      "- Confirm communications between the parties, dates, and any signed acknowledgements.",
      "",
      "## Suggested Next Steps",
      "",
      "- Collect the missing documents.",
      "- Organize the timeline.",
      "- Mark the strongest evidence.",
      "- Ask counsel to decide whether the matter needs a notice, complaint, negotiation, or further review.",
      "",
      "## Caution",
      "",
      `**AI provider fallback is active**, so this is a limited workspace response rather than a live model answer. Context preview: ${snippet}`
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
