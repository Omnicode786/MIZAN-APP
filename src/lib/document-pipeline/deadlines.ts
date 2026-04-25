export function extractDeadlines(text: string) {
  const patterns = [
    {
      title: "Notice-related deadline",
      regex: /(\d{1,3})\s+days?\s+(written\s+)?notice/i
    },
    {
      title: "Payment deadline",
      regex: /(\d{1,3})\s+days?\s+of\s+invoice/i
    },
    {
      title: "Reply deadline",
      regex: /reply\s+within\s+(\d{1,3})\s+days?/i
    }
  ];

  return patterns
    .map((pattern, index) => {
      const match = text.match(pattern.regex);
      if (!match) return null;
      const days = Number(match[1]);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      return {
        id: `deadline-${index + 1}`,
        title: pattern.title,
        dueDate: dueDate.toISOString(),
        notes: `Detected from language: "${match[0]}"`,
        status: "UPCOMING",
        importance: days <= 14 ? "HIGH" : days <= 30 ? "MEDIUM" : "LOW"
      };
    })
    .filter(Boolean);
}
