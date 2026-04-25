"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  LockKeyhole,
  Moon,
  Scale,
  ShieldCheck,
  Sun,
  UserRoundCheck
} from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/logo";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const highlights = [
  {
    title: "For clients",
    text: "Open your legal matters, documents, drafts, deadlines, and lawyer requests.",
    icon: UserRoundCheck
  },
  {
    title: "For lawyers",
    text: "Review assigned cases, proposals, evidence, notes, and case strategy tools.",
    icon: BriefcaseBusiness
  },
  {
    title: "AI-assisted workflow",
    text: "Continue with document-aware help, case readiness checks, and structured guidance.",
    icon: BrainCircuit
  }
];

export default function LoginPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const language = useLanguage();

  useEffect(() => {
    const storedTheme = localStorage.getItem("mizan-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme =
      storedTheme === "dark" || (!storedTheme && prefersDark) ? "dark" : "light";

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    localStorage.setItem("mizan-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-260px] h-[620px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-240px] top-[220px] h-[480px] w-[480px] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 md:px-6 md:py-8">
        <header className="flex items-center justify-between gap-4 rounded-full border border-border/70 bg-card/80 px-5 py-3 shadow-sm backdrop-blur-xl">
          <Logo />

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/" className="transition hover:text-foreground">
              Platform
            </Link>
            <Link href="/lawyers" className="transition hover:text-foreground">
              {t(language, "lawyers")}
            </Link>
            <Link href="/signup" className="transition hover:text-foreground">
              {t(language, "signup")}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle compact />

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="rounded-full"
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <Button asChild className="hidden sm:inline-flex">
              <Link href="/signup">
                {t(language, "signup")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="grid flex-1 gap-10 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-14">
          <section className="mx-auto w-full max-w-2xl lg:mx-0">
            <div className="inline-flex flex-wrap gap-2">
              <Badge variant="outline">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Secure legal workspace
              </Badge>
              <Badge variant="secondary">
                <Scale className="mr-1 h-3.5 w-3.5" />
                Client and lawyer access
              </Badge>
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
              Welcome back to MIZAN.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
              Sign in to continue managing matters, documents, deadlines, drafts,
              lawyer requests, and structured legal workflows.
            </p>

            <div className="mt-8 grid gap-3">
              {highlights.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="group rounded-3xl border border-border/70 bg-card/75 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="text-sm font-medium">{item.title}</h2>
                        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LockKeyhole className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-medium">Role-aware access</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Clients access their own matters. Lawyers access only assigned
                    cases, private notes, proposals, and review tools connected to
                    their profile.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid place-items-center">
            <div className="w-full max-w-lg">
              <Card className="overflow-hidden border-border/70 bg-card/90 shadow-2xl backdrop-blur">
                <CardContent className="p-0">
                  <div className="border-b border-border/70 bg-muted/20 p-6">
                    <Badge variant="outline">
                      <LockKeyhole className="mr-1 h-3.5 w-3.5" />
                      Protected session
                    </Badge>

                    <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                      Sign in
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Continue from your saved workspace and active legal matters.
                    </p>
                  </div>

                  <div className="p-6">
                    <LoginForm />
                  </div>
                </CardContent>
              </Card>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="group flex flex-1 items-center justify-between rounded-3xl border border-border/70 bg-card/70 p-4 text-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div>
                    <p className="font-medium">Create workspace</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Join as a client or lawyer.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </Link>

                <Link
                  href="/lawyers"
                  className="group flex flex-1 items-center justify-between rounded-3xl border border-border/70 bg-card/70 p-4 text-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div>
                    <p className="font-medium">Explore lawyers</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      View public profiles.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}