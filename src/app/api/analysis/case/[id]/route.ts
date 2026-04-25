import { NextResponse } from "next/server";
import { handleApiError, notFound } from "@/lib/api-response";
import { buildCaseContext } from "@/lib/legal-ai";
import { analyzeCaseText } from "@/lib/document-pipeline/analyze";
import { normalizeLanguage } from "@/lib/language";
import { getAccessibleCase } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { legalCase } = await getAccessibleCase(params.id);
    if (!legalCase) return notFound();

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
  } catch (error) {
    return handleApiError(error, "CASE_ANALYSIS_ROUTE", "Unable to analyze this case right now.");
  }
}
