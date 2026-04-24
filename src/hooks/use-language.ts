"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, normalizeLanguage, type AppLanguage } from "@/lib/language";

export const LANGUAGE_STORAGE_KEY = "lawsphere-language";
export const LANGUAGE_CHANGE_EVENT = "lawsphere-language-change";

export function useLanguage() {
  const [language, setLanguage] = useState<AppLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    function readStoredLanguage() {
      setLanguage(normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)));
    }

    function onLanguageChange(event: Event) {
      const customEvent = event as CustomEvent<AppLanguage>;
      setLanguage(normalizeLanguage(customEvent.detail));
    }

    function onStorage(event: StorageEvent) {
      if (event.key === LANGUAGE_STORAGE_KEY) {
        setLanguage(normalizeLanguage(event.newValue));
      }
    }

    readStoredLanguage();
    window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return language;
}
