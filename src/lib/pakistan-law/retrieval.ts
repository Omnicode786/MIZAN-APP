import pakistanLaw from "@/lib/pakistan-law/pakistan-law.json";

type ActRecord = {
  key: string;
  title: string;
  useCases?: string[];
  summary: string;
  productHints?: string[];
  sourceType?: string;
};

const acts = pakistanLaw.acts as ActRecord[];

function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

export function getRelevantPakistanLaw(query: string, limit = 4) {
  const tokens = tokenize(query);

  return acts
    .map((act) => {
      const haystack = [act.title, act.summary, ...(act.useCases || []), ...(act.productHints || [])]
        .join(" ")
        .toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { ...act, score };
    })
    .filter((act) => act.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildPakistanLawContext(query: string) {
  const matches = getRelevantPakistanLaw(query, 5);
  if (!matches.length) {
    return {
      matches: [],
      context:
        "No strongly matched Pakistan-law entry was retrieved from the local starter pack. Respond cautiously and say where lawyer review may still be needed."
    };
  }

  return {
    matches,
    context: matches
      .map(
        (act, index) =>
          `${index + 1}. ${act.title}\nUse cases: ${(act.useCases || []).join(", ")}\nSummary: ${act.summary}`
      )
      .join("\n\n")
  };
}
