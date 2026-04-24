"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Gavel,
  Gauge,
  Landmark,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  Moon,
  Network,
  Route,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  UsersRound,
  Zap
} from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const productPillars = [
  {
    title: "Upload-to-insight intake",
    text: "Legal files, screenshots, notices, emails, agreements, and proof records are transformed into summaries, risks, tags, timeline events, and action items.",
    icon: FileSearch
  },
  {
    title: "AI Case Agent",
    text: "The agent reads the live case record, detects missing evidence, recommends next steps, and prepares matters for lawyer review with structured reasoning.",
    icon: BrainCircuit
  },
  {
    title: "Client-to-lawyer workflow",
    text: "Clients discover public lawyer profiles, share selected matters, receive proposals, and unlock contact only after approving the lawyer.",
    icon: BriefcaseBusiness
  },
  {
    title: "Lawyer debate mode",
    text: "Lawyers can stress-test a matter against AI opposing counsel using actual case material, then receive a structured scorecard and weakness analysis.",
    icon: Gavel
  }
];

const workflowSteps = [
  {
    title: "Create matter",
    detail: "Record the legal issue, facts, desired relief, urgency, and parties involved.",
    state: "Workspace"
  },
  {
    title: "Upload evidence",
    detail: "Files become searchable evidence, summaries, extracted facts, and timeline anchors.",
    state: "Intake"
  },
  {
    title: "Map next steps",
    detail: "The Case Agent recommends a practical path based on available and missing material.",
    state: "Agent"
  },
  {
    title: "Prepare draft",
    detail: "Generate notices, complaints, responses, or revision suggestions from case context.",
    state: "Drafting"
  },
  {
    title: "Request lawyer review",
    detail: "Send a structured case brief to a selected lawyer and review their proposal.",
    state: "Handoff"
  }
];

const clientFeatures = [
  "Create and manage legal matters",
  "Upload evidence and documents",
  "Ask document-aware questions",
  "View evidence gaps and readiness",
  "Generate notices and complaint drafts",
  "Search public lawyer profiles",
  "Send structured lawyer requests",
  "Track deadlines and next actions"
];

const lawyerFeatures = [
  "Review assigned client matters",
  "Send proposals with fee and posture",
  "Use AI pre-briefs and summaries",
  "Debate against AI opposing counsel",
  "Add private internal notes",
  "Verify or correct AI drafts",
  "Track multi-client deadlines",
  "Prepare lawyer-ready case bundles"
];

const agentCards = [
  {
    label: "Case Readiness",
    value: "Scored",
    text: "Evidence posture, draft quality, deadlines, missing records, and escalation readiness are evaluated together.",
    icon: Gauge
  },
  {
    label: "Evidence Gaps",
    value: "Detected",
    text: "The system identifies missing receipts, notices, addresses, IDs, delivery proof, replies, and supporting documents.",
    icon: ClipboardCheck
  },
  {
    label: "Legal Roadmap",
    value: "Mapped",
    text: "Each matter receives a practical action path based on the category, uploaded evidence, and case progress.",
    icon: Route
  }
];

const legalAreas = [
  "Contract review",
  "Rental disputes",
  "Employment issues",
  "Cyber complaints",
  "Harassment complaints",
  "Payment disputes",
  "Vendor disputes",
  "Legal notices"
];

const cockpitMetrics = [
  ["Matter readiness", "Structured"],
  ["Evidence posture", "Tracked"],
  ["Draft quality", "Reviewable"],
  ["Lawyer handoff", "Controlled"]
];

const trustPrinciples = [
  {
    title: "AI-assisted, not lawyer-replacing",
    text: "AI helps organize, extract, draft, and reason. Lawyers remain responsible for verification and legal strategy.",
    icon: ShieldCheck
  },
  {
    title: "Case-first architecture",
    text: "Every answer, draft, deadline, comment, and request is connected to a matter record instead of floating in chat.",
    icon: Network
  },
  {
    title: "Privacy-aware collaboration",
    text: "Clients control what they share. Lawyer contact and deeper collaboration unlock only after proposal approval.",
    icon: LockKeyhole
  }
];

export default function LandingPage() {
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
        <div className="absolute left-1/2 top-0 h-[560px] w-[980px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-220px] top-[260px] h-[460px] w-[460px] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-140px] h-[460px] w-[460px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute left-[20%] top-[48%] h-[280px] w-[280px] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="sticky top-5 z-40 flex items-center justify-between gap-4 rounded-full border border-border/70 bg-card/80 px-5 py-3 shadow-sm backdrop-blur-xl">
          <Logo />

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#workflow" className="transition hover:text-foreground">
              Workflow
            </a>
            <a href="#agent" className="transition hover:text-foreground">
              Case Agent
            </a>
            <a href="#lawyers" className="transition hover:text-foreground">
              {t(language, "lawyers")}
            </a>
            <a href="#journey" className="transition hover:text-foreground">
              Platform
            </a>
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
              <Link href="/login">{t(language, "login")}</Link>
            </Button>

            <Button asChild>
              <Link href="/signup">
                {t(language, "getStarted")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                <Landmark className="mr-1 h-3.5 w-3.5" />
                Pakistani legal workflow OS
              </Badge>
              <Badge variant="secondary">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Agent-powered legal operations
              </Badge>
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              The legal case operating system for clients and lawyers.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground lg:text-lg">
              MIZAN turns legal confusion into a structured matter workspace.
              Clients organize evidence and request lawyer review. Lawyers receive
              cleaner files, stronger briefs, and AI-assisted case analysis.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start a matter
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/lawyers">{t(language, "browseLawyers")}</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {trustPrinciples.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="group rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 font-medium">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-violet-500/10 to-cyan-500/10 blur-2xl" />

            <Card className="overflow-hidden border-border/70 bg-card/90 shadow-2xl backdrop-blur">
              <CardContent className="p-0">
                <div className="border-b border-border/70 bg-muted/25 px-6 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Live matter cockpit</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Intake, evidence, deadlines, drafts, requests, and lawyer review in one place.
                      </p>
                    </div>
                    <Badge variant="warning">Workflow active</Badge>
                  </div>
                </div>

                <div className="grid gap-4 p-6">
                  <div className="grid gap-3 sm:grid-cols-4">
                    {cockpitMetrics.map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-border/70 bg-background/70 p-4"
                      >
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-2 text-lg font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">AI Case Agent</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Converts the live case record into next legal workflow actions.
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Bot className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        "Identify missing documents before escalation.",
                        "Prepare a structured lawyer handoff brief.",
                        "Recommend the next legal workflow step from case context."
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Matter roadmap</p>
                      <Badge variant="success">Structured</Badge>
                    </div>

                    <div className="mt-5 space-y-3">
                      {workflowSteps.map((step, index) => (
                        <div
                          key={step.title}
                          className="flex items-start gap-4 rounded-2xl border border-border/70 bg-card p-4"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium">{step.title}</p>
                              <Badge
                                variant={
                                  step.state === "Agent" || step.state === "Handoff"
                                    ? "warning"
                                    : step.state === "Workspace"
                                      ? "success"
                                      : "secondary"
                                }
                              >
                                {step.state}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="workflow" className="py-10">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline">Workflow-first legal AI</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Built around legal action, not generic conversation.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                Every module moves a matter forward: intake, analysis, timeline,
                evidence readiness, drafting, lawyer review, and structured follow-up.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/signup">
                Open your workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {productPillars.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="group border-border/70 bg-card/80 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {feature.text}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section
          id="agent"
          className="grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
        >
          <div>
            <Badge variant="secondary">
              <BrainCircuit className="mr-1 h-3.5 w-3.5" />
              MIZAN Case Agent
            </Badge>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">
              An AI agent that understands what a matter needs next.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
              The Case Agent reviews facts, uploaded files, timeline events,
              drafts, deadlines, collaboration status, and lawyer handoff state. It
              then turns the case into a practical action plan.
            </p>

            <div className="mt-6 grid gap-3">
              {[
                "Detect missing evidence, weak points, and unclear facts",
                "Map a legal action roadmap for the selected matter",
                "Suggest draft, deadline, handoff, and review actions",
                "Keep AI insights separate from lawyer-verified decisions"
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
            {agentCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.label}
                  className="group border-border/70 bg-card/85 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <CardContent className="flex gap-5 p-6">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold">{card.label}</h3>
                        <Badge variant="outline">{card.value}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {card.text}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="lawyers" className="py-14">
          <Card className="overflow-hidden border-border/70">
            <CardContent className="grid gap-0 p-0 lg:grid-cols-2">
              <div className="border-b border-border/70 bg-muted/20 p-8 lg:border-b-0 lg:border-r">
                <Badge variant="outline">
                  <UsersRound className="mr-1 h-3.5 w-3.5" />
                  For clients
                </Badge>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                  Understand, organize, and present your matter clearly.
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Clients can collect evidence, understand missing records, track
                  next steps, prepare drafts, and request a specific lawyer when the
                  case is ready for review.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {clientFeatures.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl bg-card p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card p-8">
                <Badge variant="secondary">
                  <Scale className="mr-1 h-3.5 w-3.5" />
                  For lawyers
                </Badge>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                  Receive cleaner matters and review with stronger context.
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Lawyers receive organized case records, extracted evidence,
                  timelines, summaries, draft states, private notes, deadline
                  tracking, and adversarial AI review.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {lawyerFeatures.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl bg-muted/30 p-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="journey" className="py-14">
          <div className="mb-8 text-center">
            <Badge variant="outline">Platform journey</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              A complete matter lifecycle in one workspace.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              MIZAN connects client intake, document intelligence, legal
              roadmapping, drafting, lawyer proposals, and lawyer-side case
              strategy into one controlled experience.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: Upload,
                title: "1. Client uploads evidence",
                text: "Documents are classified, summarized, tagged, and connected to the case timeline."
              },
              {
                icon: ListChecks,
                title: "2. Agent creates roadmap",
                text: "The system identifies what is missing, what is urgent, and what should happen next."
              },
              {
                icon: FileText,
                title: "3. Drafting studio prepares documents",
                text: "Drafts are generated from facts, evidence, and selected legal context."
              },
              {
                icon: Search,
                title: "4. Client finds a lawyer",
                text: "Public lawyer profiles can be searched and case requests are sent with structured briefs."
              },
              {
                icon: MessageSquareText,
                title: "5. Lawyer sends proposal",
                text: "Fee, probability, posture, and notes are reviewed before contact information unlocks."
              },
              {
                icon: Zap,
                title: "6. Debate mode stress-tests strategy",
                text: "AI opposition challenges the case and returns a structured scorecard."
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="group border-border/70 bg-card/80 transition hover:-translate-y-1 hover:shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {item.text}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="py-14">
          <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-primary/10 via-card to-violet-500/10">
            <CardContent className="grid gap-8 p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <Badge variant="secondary">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  Built for trust, structure, and scale
                </Badge>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">
                  From scattered evidence to a structured legal matter.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
                  MIZAN is designed as a serious legal platform: public lawyer
                  profiles, structured case requests, AI case agents, evidence vaults,
                  debate review, deadline tracking, draft verification, and
                  client-lawyer collaboration.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href="/signup">
                      Build your matter
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">{t(language, "login")}</Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                {legalAreas.map((area) => (
                  <div
                    key={area}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 p-4"
                  >
                    <span className="text-sm font-medium">{area}</span>
                    <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
