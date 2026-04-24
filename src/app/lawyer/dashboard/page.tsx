import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { CaseCard } from "@/components/workspace/case-card";
import { DeadlineBoard } from "@/components/workspace/deadline-board";
import { RiskReadinessDashboard } from "@/components/workspace/risk-readiness-dashboard";
import { SectionHeader } from "@/components/workspace/section-header";
import { TimelineView } from "@/components/workspace/timeline-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LAWYER_NAV } from "@/lib/constants";
import { getDashboardSnapshot } from "@/lib/data-access";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function LawyerDashboardPage() {
  const user = await getCurrentUserWithProfile();
  const snapshot = await getDashboardSnapshot("LAWYER");

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/dashboard" user={user!}>
      <SectionHeader
        eyebrow="Lawyer Dashboard"
        title="Review live client matters and move the file forward"
        description="This workspace is action-driven: send proposals, refine drafts, keep internal notes, challenge the case in debate mode, and guide clients with grounded analysis."
        action={<Button asChild><Link href="/lawyer/cases">Open case queue</Link></Button>}
      />
      <RiskReadinessDashboard metrics={snapshot.metrics} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {snapshot.cases.map((legalCase: any) => (
            <CaseCard key={legalCase.id} legalCase={legalCase} hrefPrefix="/lawyer/cases" />
          ))}
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium">Triage note</p>
              <p className="mt-2 text-sm text-muted-foreground">Prioritize cases where evidence is already uploaded and the client has asked for review. Send a proposal only after checking the timeline, gaps, and deadline posture.</p>
            </CardContent>
          </Card>
          <div>
            <h2 className="mb-4 text-xl font-semibold">Deadline cockpit</h2>
            <DeadlineBoard deadlines={snapshot.deadlines} />
          </div>
          <div>
            <h2 className="mb-4 text-xl font-semibold">Recent timeline</h2>
            <TimelineView items={snapshot.timeline} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
