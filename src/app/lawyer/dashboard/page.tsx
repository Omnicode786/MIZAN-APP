import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  Gavel,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import { AppShell } from "@/components/workspace/app-shell";
import { CaseCard } from "@/components/workspace/case-card";
import { DeadlineBoard } from "@/components/workspace/deadline-board";
import { RiskReadinessDashboard } from "@/components/workspace/risk-readiness-dashboard";
import { SectionHeader } from "@/components/workspace/section-header";
import { TimelineView } from "@/components/workspace/timeline-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LAWYER_NAV } from "@/lib/constants";
import { getDashboardSnapshot } from "@/lib/data-access";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function LawyerDashboardPage() {
  const user = await getCurrentUserWithProfile();
  const snapshot = await getDashboardSnapshot("LAWYER");

  const activeCases = snapshot.cases?.length || 0;
  const pendingDeadlines = snapshot.deadlines?.length || 0;
  const recentEvents = snapshot.timeline?.length || 0;

  return (
    <AppShell
      nav={LAWYER_NAV}
      heading="Lawyer Workspace"
      currentPath="/lawyer/dashboard"
      user={user!}
    >
      <div className="space-y-6 fade-in-up">
        <section className="surface-card relative overflow-hidden rounded-[2rem]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-[-120px] top-[-120px] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-[-160px] left-[20%] h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="absolute left-[-120px] top-[30%] h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          </div>

          <div className="relative grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  <BriefcaseBusiness className="mr-1 h-3.5 w-3.5" />
                  Lawyer Command Center
                </Badge>
                <Badge variant="secondary">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  AI-assisted review
                </Badge>
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
                Review live matters, sharpen strategy, and move client cases forward.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                Your workspace brings assigned cases, evidence posture, deadlines,
                drafts, proposals, private notes, and debate mode into one structured
                review flow.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/lawyer/cases">
                    Open case queue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild variant="outline">
                  <Link href="/lawyer/debate">
                    Start debate mode
                    <Gavel className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <DashboardStat
                icon={UsersRound}
                label="Assigned matters"
                value={activeCases}
                helper="Client cases available for review"
              />
              <DashboardStat
                icon={CalendarClock}
                label="Deadlines"
                value={pendingDeadlines}
                helper="Upcoming or tracked actions"
              />
              <DashboardStat
                icon={FileText}
                label="Recent activity"
                value={recentEvents}
                helper="Timeline updates in your queue"
              />
            </div>
          </div>
        </section>

        <SectionHeader
          eyebrow="Matter Intelligence"
          title="Risk and readiness overview"
          description="Quickly scan evidence strength, draft readiness, deadline risk, and escalation posture before opening each file."
          action={
            <Button asChild variant="outline">
              <Link href="/lawyer/cases">View all matters</Link>
            </Button>
          }
        />

        <RiskReadinessDashboard metrics={snapshot.metrics} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,420px)]">
          <div className="space-y-6">
            <div className="surface-panel flex items-end justify-between gap-4 rounded-[2rem] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  Case Queue
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Matters requiring review
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open a case to review evidence, send proposals, verify drafts, or add
                  lawyer-only notes.
                </p>
              </div>

              <Badge variant="secondary">
                {activeCases} active
              </Badge>
            </div>

            {snapshot.cases?.length ? (
              <div className="grid gap-4">
                {snapshot.cases.map((legalCase: any) => (
                  <CaseCard
                    key={legalCase.id}
                    legalCase={legalCase}
                    hrefPrefix="/lawyer/cases"
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-border/80 bg-card/70">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
                    <BriefcaseBusiness className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    No assigned matters yet
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    When a client sends you a case request or approves a proposal,
                    the matter will appear here for structured review.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-6">
            <Card className="overflow-hidden border-border/70 bg-card/90">
              <CardContent className="p-0">
                <div className="border-b border-border/70 bg-muted/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Review posture</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        A practical checklist before responding to clients.
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {[
                    "Check uploaded evidence and AI summaries first.",
                    "Review deadline posture before sending a proposal.",
                    "Use internal notes for private strategy concerns.",
                    "Run debate mode when the case has enough facts."
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-border/70 bg-background/70 p-4"
                    >
                      <p className="text-sm leading-6 text-muted-foreground">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Deadline cockpit</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Upcoming actions across assigned matters.
                    </p>
                  </div>
                  <Badge variant="warning">{pendingDeadlines}</Badge>
                </div>

                <DeadlineBoard deadlines={snapshot.deadlines} />
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Recent timeline</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Latest case movement and workflow events.
                    </p>
                  </div>
                  <Badge variant="secondary">{recentEvents}</Badge>
                </div>

                <TimelineView items={snapshot.timeline} />
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
    <div className="surface-panel soft-hover rounded-3xl p-5">
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
