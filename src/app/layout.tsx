import "./globals.css";
import type { Metadata } from "next";
import { LanguageRuntime } from "@/components/language-runtime";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/theme-provider";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${APP_NAME} - AI legal case operating system`,
  description:
    "MIZAN is a premium legal-tech MVP for case intake, contract analysis, drafting, timelines, deadlines, and lawyer collaboration."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    (function() {
      try {
        var root = document.documentElement;
        var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
        var system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        var theme = stored === "light" || stored === "dark" ? stored : system;
        root.classList.toggle("dark", theme === "dark");
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
      } catch (error) {}
    })();
  `;

  return (
    <html lang="en" dir="ltr" data-language="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <LanguageRuntime />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
