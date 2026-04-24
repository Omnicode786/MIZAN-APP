const DATE_REGEX = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;

function normalizeDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [a, b, c] = value.split(/[\/\-]/);
  const year = c.length === 2 ? `20${c}` : c;
  return `${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
}

function inferTitle(context: string) {
  const lowered = context.toLowerCase();
  if (lowered.includes("signed") || lowered.includes("agreement")) return "Agreement or key document date";
  if (lowered.includes("notice")) return "Notice-related event";
  if (lowered.includes("payment") || lowered.includes("invoice")) return "Payment-related event";
  if (lowered.includes("complaint")) return "Complaint-related event";
  return "Detected key event";
}

export function extractTimeline(text: string) {
  const matches = Array.from(text.matchAll(DATE_REGEX));
  const events = matches.slice(0, 6).map((match, index) => {
    const start = Math.max(0, match.index! - 80);
    const end = Math.min(text.length, match.index! + match[0].length + 80);
    const context = text.slice(start, end).replace(/\s+/g, " ").trim();
    return {
      id: `timeline-${index + 1}`,
      title: inferTitle(context),
      description: context,
      eventDate: normalizeDate(match[0]),
      confidence: 0.68,
      sourceLabel: "document"
    };
  });

  return events;
}
