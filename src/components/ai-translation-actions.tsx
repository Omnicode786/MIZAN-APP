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

  async function translate(nextLanguage: AppLanguage) {
    setLoading(nextLanguage);
    setError("");

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

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Translation failed.");

      setTranslatedText(data.translatedText || text);
      setTargetLanguage(nextLanguage);
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
        <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {languageLabels[targetLanguage]}
          </p>
          <FormattedAiContent content={translatedText} />
        </div>
      ) : null}
    </div>
  );
}
