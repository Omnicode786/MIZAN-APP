const REDACTION_PATTERNS = {
  phone: /\b(?:\+92|0)?3\d{2}[- ]?\d{7}\b/g,
  email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  cnic: /\b\d{5}-\d{7}-\d\b/g,
  passport: /\b[A-Z]{2}\d{7}\b/g,
  bank: /\b(?:PK\d{2}[A-Z]{4}\d{16}|\d{16})\b/g,
  address: /\b\d{1,4}[^,\n]+(Road|Rd|Street|St|Avenue|Ave|Block|Sector)\b/gi
};

export function redactText(text: string, rules: string[]) {
  let output = text;

  for (const rule of rules) {
    const pattern = REDACTION_PATTERNS[rule as keyof typeof REDACTION_PATTERNS];
    if (pattern) {
      output = output.replace(pattern, "[REDACTED]");
    }
  }

  return output;
}
