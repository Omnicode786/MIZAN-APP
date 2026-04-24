import { NextResponse } from "next/server";
import { buildCaseContext } from "@/lib/legal-ai";
import { analyzeCaseText } from "@/lib/document-pipeline/analyze";
import { normalizeLanguage } from "@/lib/language";
import { getAccessibleCase } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { legalCase } = await getAccessibleCase(params.id);
  if (!legalCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  let language = normalizeLanguage(undefined);
  try {
    const body = await request.json();
    language = normalizeLanguage(body?.language);
  } catch {
    language = normalizeLanguage(undefined);
  }

  const built = await buildCaseContext(params.id);
  const analysis = await analyzeCaseText(
    built?.text || legalCase.description || "No uploaded text yet.",
    legalCase.category,
    language
  );
  return NextResponse.json({ analysis });
}
