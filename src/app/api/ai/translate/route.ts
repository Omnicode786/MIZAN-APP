import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { runAiTask } from "@/lib/ai";
import { getLanguageInstruction, normalizeLanguage } from "@/lib/language";

const schema = z.object({
  text: z.string().min(1),
  targetLanguage: z.enum(["en", "ur", "roman-ur"])
});

export async function POST(request: Request) {
  const user = await getCurrentUserWithProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await request.json());
  const targetLanguage = normalizeLanguage(body.targetLanguage);

  const prompt = [
    "Translate the supplied legal-tech content into the target language.",
    getLanguageInstruction(targetLanguage),
    "Do not summarize, omit, add advice, or change legal meaning.",
    "Preserve headings, bullets, legal references, names, dates, amounts, citations, and markdown structure.",
    "Return only the translated content.",
    `Content:\n${body.text}`
  ].join("\n\n");

  const result = await runAiTask(prompt, body.text);
  const translatedText = result.provider === "mock" ? body.text : result.text;

  return NextResponse.json({
    translatedText,
    targetLanguage,
    provider: result.provider,
    fallback: result.provider === "mock"
  });
}
