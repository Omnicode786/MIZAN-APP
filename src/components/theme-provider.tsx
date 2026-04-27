"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { isThemePreset, type ThemePreset } from "@/lib/theme-presets";

export type ThemeSetting = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type UiMode = "classic" | "glass";

const THEME_STORAGE_KEY = "mizan-theme";
const UI_MODE_STORAGE_KEY = "mizan-ui-mode";
const THEME_PRESET_STORAGE_KEY = "mizan-theme-preset";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

type ThemeContextValue = {
  mounted: boolean;
  theme: ThemeSetting;
  resolvedTheme: ResolvedTheme;
  uiMode: UiMode;
  themePreset: ThemePreset;
  setTheme: (theme: ThemeSetting) => void;
  toggleTheme: () => void;
  setUiMode: (mode: UiMode) => void;
  toggleUiMode: () => void;
  setThemePreset: (preset: ThemePreset) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(theme: ThemeSetting, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") {
    return prefersDark ? "dark" : "light";
  }

  return theme;
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function applyUiMode(mode: UiMode) {
  document.documentElement.dataset.uiMode = mode;
}

function applyThemePreset(preset: ThemePreset) {
  document.documentElement.dataset.themePreset = preset;
}

function getStoredTheme(): ThemeSetting {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    return storedTheme;
  }

  return "system";
}

function getStoredUiMode(): UiMode {
  const storedMode = window.localStorage.getItem(UI_MODE_STORAGE_KEY);
  return storedMode === "classic" ? "classic" : "glass";
}

function getStoredThemePreset(): ThemePreset {
  const storedPreset = window.localStorage.getItem(THEME_PRESET_STORAGE_KEY);
  return isThemePreset(storedPreset) ? storedPreset : "original";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<ThemeSetting>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [uiMode, setUiModeState] = useState<UiMode>("glass");
  const [themePreset, setThemePresetState] = useState<ThemePreset>("original");

  useEffect(() => {
    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const storedTheme = getStoredTheme();
    const storedUiMode = getStoredUiMode();
    const storedThemePreset = getStoredThemePreset();
    const nextResolvedTheme = resolveTheme(storedTheme, mediaQuery.matches);

    setThemeState(storedTheme);
    setResolvedTheme(nextResolvedTheme);
    setUiModeState(storedUiMode);
    setThemePresetState(storedThemePreset);
    applyTheme(nextResolvedTheme);
    applyUiMode(storedUiMode);
    applyThemePreset(storedThemePreset);
    setMounted(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        const nextTheme =
          event.newValue === "light" || event.newValue === "dark" || event.newValue === "system"
            ? event.newValue
            : "system";
        const nextThemeResolved = resolveTheme(nextTheme, mediaQuery.matches);

        setThemeState(nextTheme);
        setResolvedTheme(nextThemeResolved);
        applyTheme(nextThemeResolved);
      }

      if (event.key === UI_MODE_STORAGE_KEY) {
        const nextUiMode = event.newValue === "classic" ? "classic" : "glass";
        setUiModeState(nextUiMode);
        applyUiMode(nextUiMode);
      }

      if (event.key === THEME_PRESET_STORAGE_KEY) {
        const nextThemePreset = isThemePreset(event.newValue) ? event.newValue : "original";
        setThemePresetState(nextThemePreset);
        applyThemePreset(nextThemePreset);
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const onMediaChange = (event: MediaQueryListEvent) => {
      if (theme !== "system") {
        return;
      }

      const nextResolvedTheme = resolveTheme("system", event.matches);
      setResolvedTheme(nextResolvedTheme);
      applyTheme(nextResolvedTheme);
    };

    mediaQuery.addEventListener("change", onMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", onMediaChange);
    };
  }, [mounted, theme]);

  const setTheme = useCallback((nextTheme: ThemeSetting) => {
    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const nextResolvedTheme = resolveTheme(nextTheme, mediaQuery.matches);

    setThemeState(nextTheme);
    setResolvedTheme(nextResolvedTheme);

    if (nextTheme === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }

    applyTheme(nextResolvedTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const setUiMode = useCallback((nextUiMode: UiMode) => {
    setUiModeState(nextUiMode);
    window.localStorage.setItem(UI_MODE_STORAGE_KEY, nextUiMode);
    applyUiMode(nextUiMode);
  }, []);

  const toggleUiMode = useCallback(() => {
    setUiMode(uiMode === "glass" ? "classic" : "glass");
  }, [setUiMode, uiMode]);

  const setThemePreset = useCallback((nextThemePreset: ThemePreset) => {
    setThemePresetState(nextThemePreset);
    window.localStorage.setItem(THEME_PRESET_STORAGE_KEY, nextThemePreset);
    applyThemePreset(nextThemePreset);
  }, []);

  const value = useMemo(
    () => ({
      mounted,
      theme,
      resolvedTheme,
      uiMode,
      themePreset,
      setTheme,
      toggleTheme,
      setUiMode,
      toggleUiMode,
      setThemePreset
    }),
    [
      mounted,
      theme,
      resolvedTheme,
      uiMode,
      themePreset,
      setTheme,
      toggleTheme,
      setUiMode,
      toggleUiMode,
      setThemePreset
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

export { THEME_STORAGE_KEY, UI_MODE_STORAGE_KEY, THEME_PRESET_STORAGE_KEY };
