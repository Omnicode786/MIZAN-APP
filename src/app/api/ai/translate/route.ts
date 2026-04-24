import { NextResponse } from "next/server";
import { z } from "zod";
import { AiProviderError } from "@/lib/ai";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { runAiTask } from "@/lib/ai";
import { getLanguageInstruction, normalizeLanguage } from "@/lib/language";

const schema = z.object({
  text: z.string().min(1),
  targetLanguage: z.enum(["en", "ur", "roman-ur"])
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.parse(await request.json());
    const targetLanguage = normalizeLanguage(body.targetLanguage);

    const prompt = [
      "Translate the complete supplied legal-tech content into the target language.",
      getLanguageInstruction(targetLanguage),
      "Do not summarize, omit, add advice, or change legal meaning.",
      "Preserve headings, bullets, legal references, names, dates, amounts, citations, and markdown structure.",
      "Translate every part of the source text, including short labels, bullet points, and concluding notes.",
      "The full source text is provided in Working context.",
      "Return only the translated content in Markdown.",
      "Do not wrap the answer in a code block.",
    ].join("\n\n");

    const result = await runAiTask(prompt, body.text, {
      maxOutputTokens: 8192,
      temperature: 0.1
    });
    const translatedText = result.provider === "mock" ? body.text : result.text;

    return NextResponse.json({
      translatedText,
      targetLanguage,
      provider: result.provider,
      fallback: result.provider === "mock"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Translation request is invalid." },
        { status: 400 }
      );
    }

    if (error instanceof AiProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    console.error("Translate route failed.", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Translation failed." },
      { status: 500 }
    );
  }
}
