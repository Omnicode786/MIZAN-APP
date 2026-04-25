const CLAUSE_PATTERNS = [
  {
    clause: "Payment terms",
    regex: /(payment|invoice|due within|late fee|penalty)/i,
    severity: "warning",
    insight: "Payment mechanics or delay exposure detected."
  },
  {
    clause: "Termination",
    regex: /(terminate|termination|written notice|notice period)/i,
    severity: "success",
    insight: "Termination controls or notice mechanics detected."
  },
  {
    clause: "Ownership / IP",
    regex: /(ownership|intellectual property|IP|license)/i,
    severity: "destructive",
    insight: "Ownership or IP rights language detected or needs review."
  }
];

export function buildClauseHeatmap(text: string) {
  return CLAUSE_PATTERNS.map((item) => {
    const match = text.match(item.regex);
    return {
      clause: item.clause,
      severity: match ? item.severity : "warning",
      excerpt: match?.[0] || "Clause not clearly found in extracted text.",
      insight: match ? item.insight : `MIZAN could not confidently locate a clear ${item.clause.toLowerCase()} clause.`
    };
  });
}
