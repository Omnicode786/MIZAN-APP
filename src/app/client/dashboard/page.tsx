import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  Route,
  ShieldCheck,
  Sparkles,
  Upload,
  Zap
} from "lucide-react";
import { AppShell } from "@/components/workspace/app-shell";
import { CaseCard } from "@/components/workspace/case-card";
import { SectionHeader } from "@/components/workspace/section-header";
import { DeadlineBoard } from "@/components/workspace/deadline-board";
import { RiskReadinessDashboard } from "@/components/workspace/risk-readiness-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FrostedSurface as GlassSurface } from "@/components/ui/frosted-surface";
import { CLIENT_NAV } from "@/lib/constants";
import { getDashboardSnapshot } from "@/lib/data-access";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { cn, formatDate, relativeDate, toTitleCase } from "@/lib/utils";

export default async function ClientDashboardPage() {
  const user = await getCurrentUserWithProfile();
  const snapshot = await getDashboardSnapshot("CLIENT");

  const activeCases = snapshot.cases?.length || 0;
  const upcomingDeadlines = snapshot.deadlines?.length || 0;
  const recentEvents = snapshot.timeline?.length || 0;

  return (
    <AppShell
      nav={CLIENT_NAV}
      heading="Client Workspace"
      currentPath="/client/dashboard"
      user={user!}
    >
      <div className="space-y-7 fade-in-up">
        <GlassSurface
          className="fade-in-up overflow-hidden"
          borderRadius={34}
          borderGlow
          backgroundOpacity={0.16}
          blur={15}
          saturation={1.44}
          innerClassName="relative overflow-hidden rounded-[inherit]"
        >
          <section className="relative overflow-hidden rounded-[inherit]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute right-[-140px] top-[-140px] h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute bottom-[-180px] left-[20%] h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
              <div className="absolute left-[-140px] top-[25%] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
            </div>

            <div className="relative grid gap-7 p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,360px)] lg:p-8">
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      <FolderKanban className="mr-1 h-3.5 w-3.5" />
                      Client Matter Center
                    </Badge>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      AI-assisted organization
                    </Badge>
                  </div>

                  <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
                    Organize your legal matter before it reaches a lawyer.
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                    Create matters, upload evidence, understand gaps, track deadlines,
                    generate drafts, and request lawyer review from one structured
                    workspace.
                  </p>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/client/cases">
                      Open case workspace
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <Button asChild variant="outline">
                    <Link href="/client/lawyers">
                      Find a lawyer
                      <BriefcaseBusiness className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <DashboardStat
                  icon={FolderKanban}
                  label="Active matters"
                  value={activeCases}
                  helper="Cases in your workspace"
                />
                <DashboardStat
                  icon={CalendarClock}
                  label="Deadlines"
                  value={upcomingDeadlines}
                  helper="Upcoming legal actions"
                />
                <DashboardStat
                  icon={Route}
                  label="Timeline signals"
                  value={recentEvents}
                  helper="Recent case movement"
                />
              </div>
            </div>
          </section>
        </GlassSurface>

        <SectionHeader
          eyebrow="Matter Readiness"
          title="Your case readiness overview"
          description="See how complete your evidence, deadlines, drafts, and escalation posture look before requesting lawyer review."
          action={
            <Button asChild variant="outline">
              <Link href="/client/cases">View all cases</Link>
            </Button>
          }
        />

        <RiskReadinessDashboard metrics={snapshot.metrics} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,420px)]">
          <main className="space-y-6">
            <div className="surface-panel flex flex-col gap-4 rounded-[2rem] p-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Case Files
                </Badge>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  Your active matters
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Open a matter to upload evidence, ask document-aware questions,
                  generate drafts, or request lawyer review.
                </p>
              </div>

              <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                {activeCases} active
              </Badge>
            </div>

            {snapshot.cases?.length ? (
              <div className="grid gap-4">
                {snapshot.cases.map((legalCase: any) => (
                  <CaseCard
                    key={legalCase.id}
                    legalCase={legalCase}
                    hrefPrefix="/client/cases"
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-border/80 bg-card/70">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No matters yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Create your first case to start uploading documents, building a
                    timeline, generating drafts, and requesting lawyer review.
                  </p>
                  <Button asChild className="mt-5">
                    <Link href="/client/cases">
                      Create or open case workspace
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </main>

          <aside className="space-y-6">
            <Card className="glass-subtle overflow-hidden border-border/70 bg-card/90">
              <CardContent className="p-0">
                <div className="border-b border-border/70 bg-muted/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Next best action</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        A clean path before lawyer review.
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {[
                    {
                      title: "Open your strongest matter",
                      text: "Start with the case that already has documents or proof."
                    },
                    {
                      title: "Upload the clearest evidence",
                      text: "Agreement, notice, screenshot, receipt, or payment proof."
                    },
                    {
                      title: "Review the roadmap",
                      text: "Check timeline signals, missing evidence, and next steps."
                    },
                    {
                      title: "Request lawyer review",
                      text: "Send the matter once the facts look organized."
                    }
                  ].map((item, index) => (
                    <div
                      key={item.title}
                      className="glass-subtle flex gap-3 rounded-2xl p-4"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-subtle border-border/70 bg-card/90">
              <CardContent className="p-5">
                <PanelHeading
                  icon={CalendarClock}
                  title="Upcoming deadlines"
                  description="Dates and actions connected to your matters."
                  count={upcomingDeadlines}
                  countVariant="warning"
                />

                <div className="mt-4 w-full">
                  <DeadlineBoard deadlines={snapshot.deadlines} />
                </div>
              </CardContent>
            </Card>

            <TimelinePanel items={snapshot.timeline || []} />

            <Card className="glass-subtle border-border/70 bg-card/90">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Start with evidence</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      A matter becomes stronger when documents, screenshots,
                      notices, and proof records are uploaded early.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function DashboardStat({
  icon: Icon,
  label,
  value,
  helper
}: {
  icon: any;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="surface-panel glass-subtle soft-hover rounded-3xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground text-wrap-safe">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function PanelHeading({
  icon: Icon,
  title,
  description,
  count,
  countVariant = "secondary"
}: {
  icon: any;
  title: string;
  description: string;
  count?: string | number;
  countVariant?: "secondary" | "warning" | "success" | "outline";
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {typeof count !== "undefined" ? (
        <Badge variant={countVariant} className="rounded-full px-3 py-1">
          {count}
        </Badge>
      ) : null}
    </div>
  );
}

function TimelinePanel({ items }: { items: any[] }) {
  const visibleItems = items.slice(0, 6);

  return (
    <Card className="overflow-hidden border-border/70 bg-card/90">
      <CardContent className="p-0">
        <div className="border-b border-border/70 bg-muted/20 p-5">
          <PanelHeading
            icon={Clock3}
            title="Latest timeline signals"
            description="Recent uploads, roadmap entries, and case movement."
            count={items.length}
            countVariant="secondary"
          />
        </div>

        {visibleItems.length ? (
          <div className="p-5">
            <div className="relative space-y-4">
              <div className="absolute bottom-3 left-[18px] top-3 w-px bg-border" />

              {visibleItems.map((item, index) => {
                const tone = getTimelineTone(item);
                const title =
                  item.title ||
                  item.label ||
                  item.eventType ||
                  item.type ||
                  "Timeline event";

                const description =
                  item.description ||
                  item.notes ||
                  item.source ||
                  item.summary ||
                  "Case activity was recorded.";

                const date =
                  item.eventDate ||
                  item.createdAt ||
                  item.updatedAt ||
                  item.date ||
                  null;

                return (
                  <div key={item.id || index} className="relative flex gap-4">
                    <div
                      className={cn(
                        "z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background",
                        tone.ring
                      )}
                    >
                      <tone.icon className={cn("h-4 w-4", tone.iconClass)} />
                    </div>

                    <div className="glass-subtle min-w-0 flex-1 rounded-2xl p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{toTitleCase(String(title))}</p>
                        <Badge variant={tone.badgeVariant} className="rounded-full px-2.5 py-0.5 text-[11px]">
                          {tone.label}
                        </Badge>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {description}
                      </p>

                      {date ? (
                        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          {formatDate(date)} - {relativeDate(date)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <Route className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">No timeline signals yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
              Upload evidence or update a case to start building the matter timeline.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getTimelineTone(item: any): {
  label: string;
  icon: any;
  iconClass: string;
  ring: string;
  badgeVariant: "secondary" | "warning" | "success" | "outline";
} {
  const raw = String(item.eventType || item.type || item.title || "").toLowerCase();

  if (raw.includes("deadline")) {
    return {
      label: "Deadline",
      icon: CalendarClock,
      iconClass: "text-amber-500",
      ring: "border-amber-500/30",
      badgeVariant: "warning"
    };
  }

  if (raw.includes("upload") || raw.includes("document") || raw.includes("evidence")) {
    return {
      label: "Evidence",
      icon: FileText,
      iconClass: "text-primary",
      ring: "border-primary/30",
      badgeVariant: "secondary"
    };
  }

  if (raw.includes("draft") || raw.includes("notice")) {
    return {
      label: "Draft",
      icon: FileText,
      iconClass: "text-violet-500",
      ring: "border-violet-500/30",
      badgeVariant: "outline"
    };
  }

  if (raw.includes("roadmap") || raw.includes("step") || raw.includes("next")) {
    return {
      label: "Roadmap",
      icon: Zap,
      iconClass: "text-cyan-500",
      ring: "border-cyan-500/30",
      badgeVariant: "success"
    };
  }

  return {
    label: "Activity",
    icon: CheckCircle2,
    iconClass: "text-primary",
    ring: "border-border",
    badgeVariant: "secondary"
  };
}
