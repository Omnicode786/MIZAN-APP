"use client";

import { Globe2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  languageLabels,
  normalizeLanguage,
  type AppLanguage
} from "@/lib/language";
import {
  LANGUAGE_CHANGE_EVENT,
  LANGUAGE_STORAGE_KEY
} from "@/hooks/use-language";
import { cn } from "@/lib/utils";

function applyLanguage(language: AppLanguage) {
  document.documentElement.lang = language === "ur" ? "ur" : "en";
  document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  document.documentElement.dataset.language = language;
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const [language, setLanguage] = useState<AppLanguage>(DEFAULT_LANGUAGE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    setLanguage(stored);
    applyLanguage(stored);
    setMounted(true);
  }, []);

  function updateLanguage(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    applyLanguage(nextLanguage);
    window.dispatchEvent(
      new CustomEvent<AppLanguage>(LANGUAGE_CHANGE_EVENT, {
        detail: nextLanguage
      })
    );
  }

  return (
    <label
      className={cn(
        "language-toggle inline-flex h-10 w-[160px] shrink-0 items-center gap-2 rounded-2xl border border-border bg-background/75 px-3 text-sm text-foreground shadow-sm backdrop-blur transition hover:bg-muted/70",
        compact && "h-9 w-[144px] px-2"
      )}
      title="Language"
    >
      <Globe2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <select
        aria-label="Language"
        value={mounted ? language : DEFAULT_LANGUAGE}
        onChange={(event) => updateLanguage(normalizeLanguage(event.target.value))}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
        )}
      >
        {Object.entries(languageLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
