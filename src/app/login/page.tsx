"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  BriefcaseBusiness,
  FileText,
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

const workspaceHighlights = [
  {
    title: "Client workspace",
    text: "Access your legal matters, documents, evidence, deadlines, drafts, lawyer requests, and case activity.",
    icon: UserRoundCheck
  },
  {
    title: "Lawyer workspace",
    text: "Review assigned matters, send proposals, verify drafts, manage internal notes, and run case strategy tools.",
    icon: BriefcaseBusiness
  },
  {
    title: "AI Case Agent",
    text: "Use document-aware assistance, case readiness checks, evidence gap detection, and legal workflow recommendations.",
    icon: BrainCircuit
  }
];

const trustItems = [
  "Role-based account access",
  "Case-specific legal workspaces",
  "Document-aware AI assistance",
  "Lawyer verification workflow"
];

export default function LoginPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const language = useLanguage();

  useEffect(() => {
    const storedTheme = localStorage.getItem("mizan-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = storedTheme === "dark" || (!storedTheme && prefersDark) ? "dark" : "light";

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
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[980px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-220px] top-[260px] h-[460px] w-[460px] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-140px] h-[460px] w-[460px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute left-[22%] top-[48%] h-[280px] w-[280px] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="sticky top-5 z-40 flex items-center justify-between gap-4 rounded-full border border-border/70 bg-card/80 px-5 py-3 shadow-sm backdrop-blur-xl">
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

          <div className="flex items-center gap-2 sm:gap-3">
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

            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/">Home</Link>
            </Button>

            <Button asChild>
              <Link href="/signup">
                {t(language, "signup")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="grid flex-1 gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-16">
          <section className="space-y-8">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  Secure legal workspace
                </Badge>
                <Badge variant="secondary">
                  <Scale className="mr-1 h-3.5 w-3.5" />
                  Client and lawyer access
                </Badge>
              </div>

              <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
                Sign in to your structured legal workspace.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
                Continue your legal work inside MIZAN. Manage matters, review
                documents, track deadlines, prepare drafts, collaborate through
                structured case records, and use AI assistance grounded in your case
                context.
              </p>
            </div>

            <div className="grid gap-4">
              {workspaceHighlights.map((item) => {
                const Icon = item.icon;

                return (
                  <Card
                    key={item.title}
                    className="group border-border/70 bg-card/80 transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
                          <Icon className="h-5 w-5" />
                        </div>

                        <div>
                          <h2 className="font-medium">{item.title}</h2>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LockKeyhole className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-medium">Your role controls your workspace.</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Clients only access their own matters. Lawyers only access assigned
                    cases, private notes, proposals, and review tools connected to their profile.
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                Need an account?{" "}
                <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
                  Create one
                </Link>
              </p>
            </div>
          </section>

          <section className="grid place-items-center">
            <div className="w-full max-w-xl">
              <Card className="overflow-hidden border-border/70 bg-card/85 shadow-2xl backdrop-blur">
                <CardContent className="p-0">
                  <div className="border-b border-border/70 bg-muted/20 p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        <FileText className="mr-1 h-3.5 w-3.5" />
                        Case access
                      </Badge>
                      <Badge variant="secondary">
                        <LockKeyhole className="mr-1 h-3.5 w-3.5" />
                        Protected session
                      </Badge>
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                      Welcome back
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Sign in to continue from your saved cases, drafts, deadlines,
                      lawyer requests, proposals, and activity history.
                    </p>
                  </div>

                  <div className="p-6">
                    <LoginForm />
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/lawyers"
                  className="group rounded-3xl border border-border/70 bg-card/70 p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BriefcaseBusiness className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Explore lawyers</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    View public lawyer profiles before sending a case request.
                  </p>
                </Link>

                <Link
                  href="/signup"
                  className="group rounded-3xl border border-border/70 bg-card/70 p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <UserRoundCheck className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Create workspace</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Join as a client or lawyer and start with the right workflow.
                  </p>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
