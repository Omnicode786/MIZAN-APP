import "./globals.css";
import type { Metadata } from "next";
import { LanguageRuntime } from "@/components/language-runtime";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${APP_NAME} · AI legal case operating system`,
  description:
    "MIZAN is a premium legal-tech MVP for case intake, contract analysis, drafting, timelines, deadlines, and lawyer collaboration."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" data-language="en" suppressHydrationWarning>
      <body>
        <LanguageRuntime />
        {children}
      </body>
    </html>
  );
}
