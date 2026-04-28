"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform
} from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Gavel,
  Gauge,
  Landmark,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Network,
  Route,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UsersRound,
  X
} from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";
import { ThemePresetToggle } from "@/components/theme-preset-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { UiModeToggle } from "@/components/ui-mode-toggle";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GlassSurface } from "@/components/ui/glass-surface";

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

const floatingParticles = [
  { left: "8%", top: "12%", size: 10, delay: 0 },
  { left: "18%", top: "70%", size: 14, delay: 1.2 },
  { left: "58%", top: "18%", size: 8, delay: 0.4 },
  { left: "74%", top: "60%", size: 12, delay: 1.8 },
  { left: "86%", top: "28%", size: 9, delay: 0.9 },
  { left: "48%", top: "82%", size: 11, delay: 1.4 }
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

const journeyCards = [
  {
    title: "Intake workspace",
    text: "Capture the issue, upload records, and organize all evidence under one matter.",
    icon: Upload
  },
  {
    title: "Case reasoning",
    text: "Ask questions, view risks, missing evidence, and readiness analysis generated from your records.",
    icon: Search
  },
  {
    title: "Draft and revise",
    text: "Generate notices, complaints, responses, or lawyer-ready summaries and improve them iteratively.",
    icon: FileText
  },
  {
    title: "Collaborate with lawyers",
    text: "Send a structured request, compare proposals, and move forward with clearer legal preparation.",
    icon: MessageSquareText
  }
];

const heroTrustSignals = [
  "Trusted by 500+ law firms",
  "SOC 2 Certified",
  "GDPR Compliant"
];

export default function LandingPage() {
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [landingNavOpen, setLandingNavOpen] = useState(false);
  const language = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 96]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 32]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, -32]);

  useEffect(() => {
    if (shouldReduceMotion) return;

    const timer = window.setInterval(() => {
      setHeadlineIndex((current) => (current + 1) % workflowSteps.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [shouldReduceMotion]);

  const surfaceClass =
    "rounded-xl border border-border/70 bg-card/95 text-card-foreground shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors duration-300 dark:bg-card/90 dark:shadow-[0_16px_36px_rgba(2,6,23,0.32)]";
  const bodyCopyClass = "max-w-[65ch] text-[13px] leading-[18px] text-muted-foreground";

  return (
    <div className="min-h-screen overflow-hidden bg-background transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 flex justify-center overflow-hidden">
          <div className="relative h-[420px] w-[min(86vw,900px)] opacity-[0.05] sm:h-[480px] lg:h-[560px]">
            <Image
              src="/logo.png"
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 86vw, 900px"
              className="object-contain"
            />
          </div>
        </div>

        <motion.div
          className="absolute inset-0"
          style={shouldReduceMotion ? undefined : { y: backgroundY }}
        >
          <motion.div
            className="absolute left-1/2 top-0 h-[560px] w-[980px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
            animate={
              shouldReduceMotion
                ? undefined
                : { scale: [1, 1.03, 1], opacity: [0.7, 1, 0.75] }
            }
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-x-[10%] top-20 h-[640px] rounded-[48px] opacity-35 [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]"
            animate={
              shouldReduceMotion
                ? undefined
                : { scale: [1, 1.02, 1], y: [0, -8, 0] }
            }
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          {floatingParticles.map((particle) => (
            <motion.span
              key={`${particle.left}-${particle.top}`}
              className="absolute rounded-full bg-primary/20 shadow-[0_0_20px_rgba(37,99,235,0.18)]"
              style={{
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size
              }}
              animate={
                shouldReduceMotion
                  ? undefined
                  : { y: [0, -14, 0], x: [0, 8, 0], opacity: [0.3, 0.7, 0.3] }
              }
              transition={{
                duration: 7,
                delay: particle.delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </div>

      <div className="mx-auto max-w-[1440px] px-3 py-3 sm:px-5 sm:py-4 xl:px-8">
        <GlassSurface
          className={`${surfaceClass} nav-surface sticky top-3 z-40 bg-card/92 backdrop-blur sm:top-4`}
          width="100%"
          height="auto"
          borderRadius={18}
          borderWidth={0.1}
          brightness={50}
          opacity={0.93}
          blur={11}
          displace={0.35}
          backgroundOpacity={0.12}
          saturation={1.18}
          distortionScale={-180}
          mixBlendMode="screen"
        >
          <div className="flex min-h-16 w-full items-center gap-2 px-3 py-2 sm:px-4 lg:grid lg:grid-cols-[minmax(150px,0.95fr)_minmax(360px,1.35fr)_minmax(360px,1fr)] lg:gap-x-4 lg:px-5 xl:grid-cols-[minmax(170px,1fr)_minmax(420px,1.35fr)_minmax(390px,1fr)] xl:gap-x-6 xl:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
              <Logo />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="ml-auto h-9 w-9 rounded-xl lg:hidden"
                onClick={() => setLandingNavOpen((open) => !open)}
                aria-label={landingNavOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={landingNavOpen}
              >
                {landingNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>

            <nav className="hidden h-full items-center justify-center gap-4 text-[14px] font-semibold text-muted-foreground xl:gap-6 lg:flex">
              <Link href="/home-2" className="inline-flex h-full items-center transition-colors duration-200 hover:text-foreground">
                Home 2
              </Link>
              <a href="#workflow" className="inline-flex h-full items-center transition-colors duration-200 hover:text-foreground">
                Workflow
              </a>
              <a href="#agent" className="inline-flex h-full items-center transition-colors duration-200 hover:text-foreground">
                Case Agent
              </a>
              <a href="#lawyers" className="inline-flex h-full items-center transition-colors duration-200 hover:text-foreground">
                {t(language, "lawyers")}
              </a>
              <a href="#journey" className="inline-flex h-full items-center transition-colors duration-200 hover:text-foreground">
                Platform
              </a>
            </nav>

            <div className="landing-topbar-actions flex min-w-0 flex-1 items-center justify-end gap-1.5 py-0.5 sm:gap-2 lg:flex-none">
              <UiModeToggle compact className="hidden h-9 rounded-xl px-2.5 xl:inline-flex [&_span]:hidden" />
              <ThemeToggle className="h-8 w-8 rounded-xl" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 rounded-xl lg:inline-flex"
                onClick={() => setLandingNavOpen((open) => !open)}
                aria-label={landingNavOpen ? "Close preferences" : "Open preferences"}
                aria-expanded={landingNavOpen}
              >
                {landingNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              <Button asChild variant="ghost" className="hidden h-9 rounded-xl px-3 text-[14px] font-semibold sm:inline-flex">
                <Link href="/login">{t(language, "login")}</Link>
              </Button>
              <Button asChild className="h-9 rounded-xl px-3 text-[14px] font-semibold sm:px-5">
                <Link href="/signup">
                  <span className="sr-only sm:not-sr-only sm:max-w-none">{t(language, "getStarted")}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 sm:ml-2" />
                </Link>
              </Button>
            </div>
          </div>
          {landingNavOpen ? (
            <div className="border-t border-border/60 px-3 pb-3 pt-2">
              <nav className="grid gap-2 text-sm font-semibold text-muted-foreground lg:hidden">
                {[
                  ["/home-2", "Home 2"],
                  ["#workflow", "Workflow"],
                  ["#agent", "Case Agent"],
                  ["#lawyers", t(language, "lawyers")],
                  ["#journey", "Platform"]
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setLandingNavOpen(false)}
                    className="glass-chip rounded-2xl px-4 py-3 transition hover:text-foreground"
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:ml-auto lg:max-w-2xl lg:grid-cols-4">
                <div className="landing-mobile-language glass-chip flex min-h-11 items-center justify-center rounded-2xl px-2">
                  <LanguageToggle compact />
                </div>
                <ThemePresetToggle compact className="h-11 w-full max-w-none rounded-2xl" />
                <UiModeToggle compact className="h-11 rounded-2xl" />
                <Button asChild variant="outline" className="h-11 rounded-2xl font-semibold">
                  <Link href="/login">{t(language, "login")}</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </GlassSurface>

        <main>
          <section ref={heroRef} className="relative pb-0 pt-8">
            <div className="rounded-[20px] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--muted)/0.6)_100%)] p-4 shadow-[0_10px_36px_rgba(15,23,42,0.05)] transition-colors duration-300 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.9)_100%)] dark:shadow-[0_22px_52px_rgba(2,6,23,0.38)] lg:p-5">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-x-8">
                <motion.div
                  className="lg:col-span-6"
                  style={shouldReduceMotion ? undefined : { y: contentY }}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <div className="flex h-full flex-col rounded-2xl bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--muted)/0.75)_100%)] p-4 transition-colors duration-300 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.82)_0%,rgba(30,41,59,0.72)_100%)] lg:p-5">
                    <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-between lg:mx-0">
                      <div>
                        <motion.div
                          className="flex flex-wrap items-center gap-2"
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                          transition={{ delay: 0.05, duration: 0.6 }}
                        >
                          <div className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2.5 text-[11px] font-medium leading-4 text-muted-foreground transition-colors duration-300 dark:bg-muted/80 dark:text-foreground/80">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Agent-powered</span>
                          </div>
                          <div className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2.5 text-[11px] font-medium leading-4 text-muted-foreground transition-colors duration-300 dark:bg-muted/80 dark:text-foreground/80">
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>Live workflow focus</span>
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={workflowSteps[headlineIndex]?.title}
                                initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                                transition={{ duration: 0.2 }}
                                className="text-primary"
                              >
                                {workflowSteps[headlineIndex]?.title}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                        </motion.div>

                        <motion.h1
                          className="mt-4 max-w-[520px] text-balance text-[42px] font-bold leading-[50px] tracking-[-0.02em] text-foreground"
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                          transition={{ delay: 0.12, duration: 0.72 }}
                        >
                          The legal case operating system for clients and lawyers.
                        </motion.h1>

                        <motion.p
                          className="mt-6 max-w-[480px] text-[14px] leading-[22px] text-muted-foreground"
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                          transition={{ delay: 0.22, duration: 0.68 }}
                        >
                          MIZAN turns legal confusion into a structured matter workspace.
                          Clients organize evidence and request lawyer review. Lawyers receive
                          cleaner files, stronger briefs, and AI-assisted case analysis.
                        </motion.p>

                        <motion.div
                          className="mt-7 flex flex-wrap items-center gap-3"
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.68 }}
                        >
                          <HeroAction href="/signup" variant="default">
                            Start a matter
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </HeroAction>
                          <HeroAction href="/lawyers" variant="outline">
                            {t(language, "browseLawyers")}
                          </HeroAction>
                        </motion.div>
                      </div>

                      <motion.div
                        className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 pt-2"
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                        transition={{ delay: 0.36, duration: 0.64 }}
                      >
                        {heroTrustSignals.map((item) => (
                          <div
                            key={item}
                            className="inline-flex items-center gap-1.5 text-[12px] leading-4 text-muted-foreground/80"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="lg:col-span-6 lg:pt-2"
                  style={shouldReduceMotion ? undefined : { y: visualY }}
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 18 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.9, ease: "easeOut" }}
                >
                  <div className="relative w-full">
                    <motion.div
                      className="absolute inset-x-8 top-8 -z-10 h-52 rounded-full bg-primary/12 blur-3xl"
                      animate={
                        shouldReduceMotion
                          ? undefined
                          : { opacity: [0.45, 0.8, 0.45], scale: [0.96, 1.02, 0.96] }
                      }
                      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <HeroOrbit />

                    <Card className="relative w-full overflow-hidden rounded-[14px] border border-border/70 bg-card/95 shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-colors duration-300 dark:bg-card/90 dark:shadow-[0_20px_48px_rgba(2,6,23,0.4)]">
                      <motion.div
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.05),transparent_28%)]"
                        animate={shouldReduceMotion ? undefined : { opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      />

                      <CardContent className="relative p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold leading-5 text-foreground">
                              Live matter cockpit
                            </p>
                            <p className="mt-0.5 truncate text-[12px] leading-4 text-muted-foreground/80">
                              Intake, evidence, deadlines, drafts, requests, and lawyer review in one place.
                            </p>
                          </div>
                          <div className="inline-flex items-center rounded-[12px] bg-emerald-500/12 px-2.5 py-1 text-[11px] font-medium leading-4 text-emerald-700 transition-colors duration-300 dark:bg-emerald-500/18 dark:text-emerald-300">
                            Workflow active
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:auto-rows-fr">
                          {cockpitMetrics.map(([label, value], index) => (
                            <motion.div
                              key={label}
                              className="relative flex h-full min-h-[118px] flex-col rounded-[10px] bg-muted/60 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors duration-300 dark:bg-muted/80"
                              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                              transition={{ delay: 0.36 + index * 0.05, duration: 0.52 }}
                            >
                              <motion.span
                                className="absolute right-3.5 top-3.5 inline-flex h-[5px] w-[5px] rounded-full bg-primary"
                                animate={shouldReduceMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
                                transition={{
                                  duration: 1.6,
                                  delay: index * 0.2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              />
                              <p className="text-[10px] font-semibold uppercase leading-4 tracking-[0.05em] text-muted-foreground">
                                {label}
                              </p>
                              <p className="mt-1.5 text-[16px] font-semibold leading-6 text-foreground">
                                {value}
                              </p>
                              <div className="mt-auto pt-3">
                                <MiniSparkline delay={index * 0.08} />
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        <div className="mt-2.5 grid gap-2.5 xl:grid-cols-[2fr_3fr] xl:items-start">
                          <div className="rounded-[10px] border border-border/70 bg-card p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors duration-300 dark:bg-card/90">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[13px] font-semibold leading-5 text-foreground">
                                  AI Case Agent
                                </p>
                                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                                  Converts the live case record into next legal workflow actions.
                                </p>
                              </div>
                              <Bot className="h-[18px] w-[18px] shrink-0 text-primary" />
                            </div>

                            <div className="mt-3 grid gap-3">
                              {[
                                "Identify missing documents before escalation.",
                                "Prepare a structured lawyer handoff brief.",
                                "Recommend the next legal workflow step from case context."
                              ].map((item, index) => (
                                <motion.div
                                  key={item}
                                  className="flex items-start gap-2.5"
                                  initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
                                  animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                                  transition={{ delay: 0.42 + index * 0.06, duration: 0.48 }}
                                >
                                  <motion.span
                                    className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                    animate={shouldReduceMotion ? undefined : { scale: [1, 1.15, 1] }}
                                    transition={{
                                      duration: 1.9,
                                      delay: index * 0.2,
                                      repeat: Infinity,
                                      ease: "easeInOut"
                                    }}
                                  >
                                    <CheckCircle2 className="h-[10px] w-[10px]" />
                                  </motion.span>
                                  <p className="text-[12px] leading-[18px] text-foreground/82 dark:text-foreground/80">{item}</p>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-[10px] border border-border/70 bg-card p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors duration-300 dark:bg-card/90">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[13px] font-semibold leading-5 text-foreground">
                                  Matter roadmap
                                </p>
                                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                                  A structured progression from evidence intake to lawyer handoff.
                                </p>
                              </div>
                              <div className="inline-flex items-center rounded-[12px] bg-emerald-500/12 px-2 py-1 text-[11px] font-medium leading-4 text-emerald-700 transition-colors duration-300 dark:bg-emerald-500/18 dark:text-emerald-300">
                                Structured
                              </div>
                            </div>

                            <div className="relative mt-3">
                              <div className="absolute bottom-2.5 left-[10px] top-2.5 w-0.5 bg-border" />
                              <div className="absolute left-[10px] top-2.5 h-5 w-0.5 bg-primary" />
                              <div className="grid gap-2.5">
                                {workflowSteps.map((step, index) => (
                                  <motion.div
                                    key={step.title}
                                    className="relative flex items-start gap-2"
                                    initial={shouldReduceMotion ? false : { opacity: 0, x: 10 }}
                                    animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                                    transition={{ delay: 0.48 + index * 0.05, duration: 0.48 }}
                                  >
                                    <motion.div
                                      className={`relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 bg-card text-[10px] font-semibold ${
                                        index === 0
                                          ? "border-primary text-primary"
                                          : "border-border text-muted-foreground"
                                      }`}
                                      animate={shouldReduceMotion ? undefined : { y: [0, -2, 0] }}
                                      transition={{
                                        duration: 2.6,
                                        delay: index * 0.18,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                      }}
                                    >
                                      {index + 1}
                                    </motion.div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-baseline gap-2">
                                        <p className="text-[12px] font-semibold leading-4 text-foreground">
                                          {step.title}
                                        </p>
                                        <Badge
                                          variant={
                                            step.state === "Agent" || step.state === "Handoff"
                                              ? "warning"
                                              : step.state === "Workspace"
                                                ? "success"
                                                : "secondary"
                                          }
                                          className="h-5 w-fit rounded-[10px] px-2 align-baseline text-[10px]"
                                        >
                                          {step.state}
                                        </Badge>
                                      </div>
                                      <p className="mt-0.5 text-[11px] leading-[14px] text-muted-foreground">
                                        {step.detail}
                                      </p>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          <section className="pb-0 pt-12">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {trustPrinciples.map((item, index) => {
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.title}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                    whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ delay: index * 0.05, duration: 0.55 }}
                  >
                    <Card className={`${surfaceClass} h-full transition-transform duration-200 hover:-translate-y-1`}>
                      <CardContent className="flex h-full flex-col p-5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-3 text-[14px] font-semibold leading-5 text-foreground">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-[13px] leading-[18px] text-muted-foreground">
                          {item.text}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>

          <motion.section
            className="pb-0 pt-8"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="border-t border-border/70">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                <HeroCounterCard
                  value={productPillars.length}
                  label="Core workflow engines"
                  description="Structured modules already mapped into the product."
                />
                <HeroCounterCard
                  value={workflowSteps.length}
                  label="Live matter stages"
                  description="From intake through lawyer handoff."
                />
                <HeroCounterCard
                  value={legalAreas.length}
                  label="Legal tracks featured"
                  description="Highlighted on the current home page."
                />
                <HeroCounterCard
                  value={2}
                  label="Workspace sides"
                  description="Client and lawyer collaboration in one flow."
                />
              </div>
            </div>
          </motion.section>

          <motion.section
            id="workflow"
            className="py-12"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          >
            <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-6">
              <div className="lg:col-span-7">
                <Badge variant="outline" className="h-7 rounded-full px-2.5 text-[11px]">Workflow-first legal AI</Badge>
                <h2 className="mt-3 max-w-[65ch] text-[32px] font-semibold leading-[40px] tracking-[-0.02em]">
                  Built around legal action, not generic conversation.
                </h2>
                <p className={`${bodyCopyClass} mt-2`}>
                  Every module moves a matter forward: intake, analysis, timeline,
                  evidence readiness, drafting, lawyer review, and structured follow-up.
                </p>
              </div>

              <div className="flex items-end lg:col-span-5 lg:justify-end">
                <Button asChild variant="outline" className="h-8 rounded-xl px-5 text-[14px]">
                  <Link href="/signup">
                    Open your workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {productPillars.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                    whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ delay: index * 0.05, duration: 0.55 }}
                  >
                    <Card className={`${surfaceClass} h-full transition-transform duration-200 hover:-translate-y-1`}>
                      <CardContent className="flex h-full flex-col p-5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-3 text-[14px] font-semibold leading-5 text-foreground">
                          {feature.title}
                        </h3>
                        <p className="mt-1.5 text-[13px] leading-[18px] text-muted-foreground">{feature.text}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          <section id="agent" className="py-12">
            <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-6">
              <div className="lg:col-span-4">
                <Badge variant="secondary" className="h-7 rounded-full px-2.5 text-[11px]">
                  <Bot className="mr-1.5 h-3.5 w-3.5" />
                  AI Case Agent
                </Badge>
                <h2 className="mt-3 max-w-[65ch] text-[32px] font-semibold leading-[40px] tracking-[-0.02em]">
                  The legal layer that checks if a case is actually ready to move.
                </h2>
                <p className={`${bodyCopyClass} mt-2`}>
                  MIZAN does not stop at document chat. It reasons over the matter
                  record, case facts, uploaded evidence, deadlines, prior drafts, and
                  lawyer review state to tell the user what is strong, what is missing,
                  and what should happen next.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-8 xl:grid-cols-3">
                {agentCards.map((card, index) => {
                  const Icon = card.icon;

                  return (
                    <motion.div
                      key={card.label}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ delay: index * 0.06, duration: 0.55 }}
                    >
                      <Card className={`${surfaceClass} h-full transition-transform duration-200 hover:-translate-y-1`}>
                        <CardContent className="flex h-full flex-col p-5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <p className="mt-4 text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                            {card.label}
                          </p>
                          <p className="mt-2 text-[18px] font-semibold leading-7">{card.value}</p>
                          <p className="mt-2 text-[13px] leading-[18px] text-muted-foreground">{card.text}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="lawyers" className="py-12">
            <div className={`${surfaceClass} overflow-hidden`}>
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="border-b border-border/70 p-5 lg:col-span-6 lg:border-b-0 lg:border-r">
                  <Badge variant="outline" className="h-7 rounded-full px-2.5 text-[11px]">
                    <UsersRound className="mr-1.5 h-3.5 w-3.5" />
                    For clients
                  </Badge>
                  <h2 className="mt-3 max-w-[65ch] text-[32px] font-semibold leading-[40px] tracking-[-0.02em]">
                    A guided legal workspace instead of scattered notes.
                  </h2>
                  <p className={`${bodyCopyClass} mt-2`}>
                    Clients can manage their own matters, upload evidence, track
                    deadlines, generate initial drafts, and approach lawyers with a
                    structured request rather than a vague message.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {clientFeatures.map((item) => (
                      <div
                        key={item}
                        className="flex h-full items-start gap-3 rounded-xl border border-border/70 bg-background px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                      >
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        <p className="text-[13px] leading-[18px] text-muted-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 lg:col-span-6">
                  <Badge variant="secondary" className="h-7 rounded-full px-2.5 text-[11px]">
                    <Scale className="mr-1.5 h-3.5 w-3.5" />
                    For lawyers
                  </Badge>
                  <h2 className="mt-3 max-w-[65ch] text-[32px] font-semibold leading-[40px] tracking-[-0.02em]">
                    Lawyer workflows with cleaner inputs and stronger preparation.
                  </h2>
                  <p className={`${bodyCopyClass} mt-2`}>
                    Lawyers receive pre-structured matters, can send proposals, run
                    debate sessions, review drafts, add internal notes, and manage
                    deadlines from a professional workspace instead of messy client chats.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {lawyerFeatures.map((item) => (
                      <div
                        key={item}
                        className="flex h-full items-start gap-3 rounded-xl border border-border/70 bg-background px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                      >
                        <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        <p className="text-[13px] leading-[18px] text-muted-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="journey" className="py-12">
            <div className="mx-auto max-w-[900px] text-center">
              <Badge variant="outline" className="h-7 rounded-full px-2.5 text-[11px]">Platform journey</Badge>
              <h2 className="mt-3 text-[32px] font-semibold leading-[40px] tracking-[-0.02em]">
                A complete matter lifecycle in one workspace.
              </h2>
              <p className="mx-auto mt-2 max-w-[65ch] text-[13px] leading-[18px] text-muted-foreground">
                From evidence upload to lawyer review, MIZAN keeps the matter
                structured, tracked, and explainable at every stage.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {journeyCards.map((item, index) => {
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.title}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                    whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ delay: index * 0.05, duration: 0.55 }}
                  >
                    <Card className={`${surfaceClass} h-full transition-transform duration-200 hover:-translate-y-1`}>
                      <CardContent className="flex h-full flex-col p-5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-3 text-[14px] font-semibold leading-5 text-foreground">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-[13px] leading-[18px] text-muted-foreground">{item.text}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>

          <section className="pb-12 pt-8">
            <div className={`${surfaceClass} overflow-hidden bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(255,255,255,0.98)_38%,rgba(37,99,235,0.06))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(15,23,42,0.96)_38%,rgba(37,99,235,0.1))]`}>
              <div className="grid grid-cols-1 gap-y-8 p-5 lg:grid-cols-12 lg:items-center lg:gap-x-6">
                <div className="lg:col-span-7">
                  <Badge variant="secondary" className="h-7 rounded-full px-2.5 text-[11px]">
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                    Built for trust, structure, and scale
                  </Badge>
                  <h2 className="mt-3 max-w-[65ch] text-[32px] font-semibold leading-[40px] tracking-[-0.02em]">
                    From scattered evidence to a structured legal matter.
                  </h2>
                  <p className={`${bodyCopyClass} mt-2`}>
                    MIZAN is designed as a serious legal platform: public lawyer
                    profiles, structured case requests, AI case agents, evidence vaults,
                    debate review, deadline tracking, draft verification, and
                    client-lawyer collaboration.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <HeroAction href="/signup" variant="default">
                      Build your matter
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </HeroAction>
                    <HeroAction href="/login" variant="outline">
                      {t(language, "login")}
                    </HeroAction>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-5">
                  {legalAreas.map((area) => (
                    <div
                      key={area}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                    >
                      <span className="text-[13px] font-medium leading-[18px]">{area}</span>
                      <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function HeroAction({
  href,
  variant,
  children
}: {
  href: string;
  variant: "default" | "outline";
  children: ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (shouldReduceMotion) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
    setOffset({ x, y });
  }

  return (
    <motion.div
      className="relative"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      animate={shouldReduceMotion ? undefined : { x: offset.x, y: offset.y }}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 220, damping: 16, mass: 0.4 }}
    >
      <motion.div
        className={
          variant === "default"
            ? "absolute -inset-2 rounded-xl bg-primary/20 blur-xl"
            : "absolute -inset-2 rounded-xl bg-primary/10 blur-xl"
        }
        initial={{ opacity: 0 }}
        whileHover={shouldReduceMotion ? undefined : { opacity: variant === "default" ? 0.7 : 0.45 }}
        transition={{ duration: 0.2 }}
      />
      <Button
        asChild
        size="lg"
        variant={variant}
        className="relative h-10 rounded-xl px-5 text-[14px] font-semibold"
      >
        <Link href={href} className="group relative overflow-hidden">
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_58%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.22),transparent_58%)]" />
          <span className="relative inline-flex items-center">{children}</span>
        </Link>
      </Button>
    </motion.div>
  );
}

function HeroOrbit() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute right-0 top-8 hidden h-[360px] w-[360px] xl:block">
      <motion.div
        className="absolute inset-0 rounded-full border border-primary/10"
        animate={shouldReduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute left-8 top-16 h-3 w-3 rounded-full bg-primary/70 shadow-[0_0_20px_rgba(37,99,235,0.35)]" />
        <span className="absolute bottom-20 right-12 h-2.5 w-2.5 rounded-full bg-primary/45 shadow-[0_0_18px_rgba(37,99,235,0.24)]" />
      </motion.div>
      <motion.div
        className="absolute inset-8 rounded-full border border-border/70"
        animate={shouldReduceMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function MiniSparkline({ delay = 0 }: { delay?: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="h-8 w-full">
      <svg viewBox="0 0 120 32" className="h-full w-full overflow-visible">
        <motion.path
          d="M2 24 C18 12, 28 18, 42 11 S68 4, 86 14 104 23, 118 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary/65"
          initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0.4 }}
          animate={shouldReduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.35 + delay, ease: "easeOut" }}
        />
        <motion.circle
          cx="86"
          cy="14"
          r="3.5"
          className="fill-primary"
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, delay, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}

function HeroCounterCard({
  value,
  label
}: {
  value: number;
  label: string;
  description: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const duration = 850;

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      setDisplayValue(Math.round(value * progress));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [inView, shouldReduceMotion, value]);

  return (
    <motion.div
      ref={ref}
      className="bg-card px-4 py-6"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.55 }}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-[36px] font-bold leading-[40px] tracking-[-0.02em] text-foreground">
          {displayValue}
        </p>
        <motion.span
          className="inline-flex h-1.5 w-1.5 rounded-full bg-primary"
          animate={shouldReduceMotion ? undefined : { opacity: [0.25, 1, 0.25], scale: [1, 1.4, 1] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="mt-1 text-[11px] font-medium uppercase leading-[14px] tracking-[0.05em] text-muted-foreground">
        {label}
      </p>
    </motion.div>
  );
}
