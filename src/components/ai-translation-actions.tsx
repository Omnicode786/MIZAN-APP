"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { languageLabels, type AppLanguage } from "@/lib/language";
import { FormattedAiContent } from "@/utils/ai-content";

const targets: AppLanguage[] = ["ur", "en", "roman-ur"];

export function AiTranslationActions({ text }: { text: string }) {
  const [translatedText, setTranslatedText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<AppLanguage | null>(null);
  const [loading, setLoading] = useState<AppLanguage | null>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("");
  const [fallback, setFallback] = useState(false);

  async function translate(nextLanguage: AppLanguage) {
    setLoading(nextLanguage);
    setError("");
    setProvider("");
    setFallback(false);

    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          targetLanguage: nextLanguage
        })
      });

      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.error || "Translation failed.");

      setTranslatedText(data.translatedText || text);
      setTargetLanguage(nextLanguage);
      setProvider(data.provider || "");
      setFallback(Boolean(data.fallback));
    } catch (err: any) {
      setError(err.message || "Translation failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Translate:</span>
        {targets.map((target) => (
          <Button
            key={target}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => translate(target)}
            disabled={loading !== null}
          >
            {loading === target ? "..." : languageLabels[target]}
          </Button>
        ))}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {translatedText && targetLanguage ? (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/75 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {languageLabels[targetLanguage]}
            </p>
            <div className="flex flex-wrap gap-2">
              {provider ? (
                <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                  {provider}
                </span>
              ) : null}
              {fallback ? (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-400">
                  Fallback
                </span>
              ) : null}
            </div>
          </div>
          <div className="max-h-[20rem] min-h-0 overflow-y-auto overscroll-y-contain pr-2">
            <FormattedAiContent content={translatedText} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function parseJsonResponse(response: Response) {
  const raw = await response.text();
  if (!raw) {
    return response.ok ? {} : { error: "The translation service returned an empty response." };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      error: response.ok
        ? "The translation service returned an unreadable response."
        : raw.slice(0, 240) || "Translation failed."
    };
  }
}
