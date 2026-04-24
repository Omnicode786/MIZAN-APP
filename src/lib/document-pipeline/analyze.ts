import pakistanLaw from "@/lib/pakistan-law/pakistan-law.json";
import { buildClauseHeatmap } from "@/lib/document-pipeline/heatmap";
import { extractTimeline } from "@/lib/document-pipeline/timeline";
import { extractDeadlines } from "@/lib/document-pipeline/deadlines";
import { getRoadmapForCase } from "@/lib/case-roadmap";
import { runAiTask } from "@/lib/ai";
import {
  getLanguageInstruction,
  normalizeLanguage,
  type AppLanguage
} from "@/lib/language";

export async function analyzeCaseText(text: string, category?: string, language?: AppLanguage) {
  const outputLanguage = normalizeLanguage(language);
  const clauseHeatmap = buildClauseHeatmap(text);
  const timeline = extractTimeline(text);
  const deadlines = extractDeadlines(text);
  const roadmap = getRoadmapForCase(category || "OTHER");

  const relevantActs = pakistanLaw.acts
    .filter((act) =>
      [act.title, ...(act.useCases || []), ...(act.productHints || []), act.summary]
        .join(" ")
        .toLowerCase()
        .split(" ")
        .some((term) => text.toLowerCase().includes(term))
    )
    .slice(0, 4)
    .map((act) => `${act.title}: ${act.summary}`)
    .join("\n");

  const summary = await runAiTask(
    [
      "Summarize the case record, identify likely dispute points, keep the output assistive rather than decisive legal advice, and stay grounded in the file record.",
      "Keep any JSON keys or action enum values in English if structured data is requested later.",
      getLanguageInstruction(outputLanguage)
    ].join("\n\n"),
    `${text}\n\nPakistan-law starter context:\n${relevantActs || "No strongly matched acts yet."}`
  );

  const metrics = {
    evidenceStrength: Math.min(90, 45 + Math.round(text.length / 25)),
    caseHealthScore: Math.min(95, 30 + timeline.length * 8 + deadlines.length * 10),
    draftReadiness: deadlines.length ? 78 : 58,
    deadlineRisk: deadlines.length ? 44 : 30,
    escalationReadiness: clauseHeatmap.some((item) => item.severity === "destructive") ? 64 : 52,
    evidenceCompleteness: Math.min(92, 32 + clauseHeatmap.filter((item) => item.excerpt !== "Clause not clearly found in extracted text.").length * 18)
  };

  return {
    summary,
    relevantActs: relevantActs ? relevantActs.split("\n") : [],
    clauseHeatmap,
    timeline,
    deadlines,
    roadmap,
    metrics
  };
}
