export type AppLanguage = "en" | "ur" | "roman-ur";

export const languageLabels: Record<AppLanguage, string> = {
  en: "English",
  ur: "اردو",
  "roman-ur": "Roman Urdu"
};

export const DEFAULT_LANGUAGE: AppLanguage = "en";

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "ur" || value === "roman-ur";
}

export function normalizeLanguage(value: unknown): AppLanguage {
  return isAppLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function getLanguageInstruction(language: AppLanguage) {
  if (language === "ur") {
    return [
      "Language requirement: Respond in clear professional Urdu using Urdu script.",
      "Keep legal terms understandable for Pakistani users.",
      "Include English legal terms in brackets where helpful, for example معاہدہ [contract].",
      "Do not make the response overly poetic.",
      "Preserve legal meaning, names, dates, amounts, headings, bullets, and structured sections."
    ].join("\n");
  }

  if (language === "roman-ur") {
    return [
      "Language requirement: Respond in clear Roman Urdu.",
      "Use simple Pakistani wording that is easy for clients and lawyers to read.",
      "Include English legal terms in brackets where helpful, for example muahida [contract].",
      "Preserve legal meaning, names, dates, amounts, headings, bullets, and structured sections."
    ].join("\n");
  }

  return "Language requirement: Respond in clear professional English while preserving legal meaning, names, dates, amounts, headings, bullets, and structured sections.";
}
