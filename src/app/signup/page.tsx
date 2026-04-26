"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  LockKeyhole,
  Scale,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { SignupForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UiModeToggle } from "@/components/ui-mode-toggle";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const roleCards = [
  {
    title: "Client account",
    text: "Create matters, upload evidence, track deadlines, request lawyer review, and manage your case record.",
    icon: UserRoundCheck
  },
  {
    title: "Lawyer account",
    text: "Receive structured case requests, review evidence, send proposals, verify drafts, and manage client matters.",
    icon: BriefcaseBusiness
  }
];

const trustItems = [
  "Role-based workspace",
  "Private case records",
  "Document-aware assistance",
  "Lawyer review workflow"
];

export default function SignupPage() {
  const language = useLanguage();

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[980px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-220px] top-[260px] h-[460px] w-[460px] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-140px] h-[460px] w-[460px] rounded-full bg-cyan-500/10 blur-3xl" />
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
            <Link href="/login" className="transition hover:text-foreground">
              {t(language, "login")}
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle compact />
            <UiModeToggle compact className="rounded-full px-3" />
            <ThemeToggle className="rounded-full" />

            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">{t(language, "login")}</Link>
            </Button>

            <Button asChild>
              <Link href="/lawyers">
                {t(language, "browseLawyers")}
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
                  <Scale className="mr-1 h-3.5 w-3.5" />
                  Client and lawyer access
                </Badge>
                <Badge variant="secondary">
                  <LockKeyhole className="mr-1 h-3.5 w-3.5" />
                  Secure onboarding
                </Badge>
              </div>

              <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
                Create your MIZAN workspace.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
                Start with the right role. Clients can organize legal matters and
                request lawyer review. Lawyers can manage structured requests,
                proposals, drafts, deadlines, and case strategy.
              </p>
            </div>

            <div className="grid gap-4">
              {roleCards.map((item) => {
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
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-medium">Your workspace follows your role.</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Clients and lawyers get different dashboards, permissions, and legal workflow tools.
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary underline underline-offset-4">
                  Login
                </Link>
              </p>
            </div>
          </section>

          <section className="grid place-items-center">
            <div className="w-full max-w-xl">
              <Card className="overflow-hidden border-border/70 bg-card/85 shadow-2xl backdrop-blur">
                <CardContent className="p-0">
                  <div className="border-b border-border/70 bg-muted/20 p-6">
                    <Badge variant="outline">
                      <LockKeyhole className="mr-1 h-3.5 w-3.5" />
                      Account setup
                    </Badge>

                    <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                      Choose your role and create account
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Your role determines your dashboard, permissions, and available legal workflow tools.
                    </p>
                  </div>

                  <div className="p-6">
                    <SignupForm />
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 flex items-center justify-between rounded-3xl border border-border/70 bg-card/70 p-5 text-sm">
                <span className="text-muted-foreground">Want to review public lawyer profiles first?</span>
                <Link href="/lawyers" className="inline-flex items-center font-medium text-primary">
                  Browse
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
