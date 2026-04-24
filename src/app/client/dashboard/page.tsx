import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { CaseCard } from "@/components/workspace/case-card";
import { SectionHeader } from "@/components/workspace/section-header";
import { TimelineView } from "@/components/workspace/timeline-view";
import { DeadlineBoard } from "@/components/workspace/deadline-board";
import { RiskReadinessDashboard } from "@/components/workspace/risk-readiness-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CLIENT_NAV } from "@/lib/constants";
import { getDashboardSnapshot } from "@/lib/data-access";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function ClientDashboardPage() {
  const user = await getCurrentUserWithProfile();
  const snapshot = await getDashboardSnapshot("CLIENT");

  return (
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/dashboard" user={user!}>
      <SectionHeader
        eyebrow="Client Dashboard"
        title="Manage your matter like an organized case file"
        description="Everything you do here changes the live record: case status, uploads, deadlines, drafts, proposals, and lawyer review."
        action={<Button asChild><Link href="/client/cases">Open case workspace</Link></Button>}
      />

      <RiskReadinessDashboard metrics={snapshot.metrics} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {snapshot.cases.map((legalCase: any) => (
            <CaseCard key={legalCase.id} legalCase={legalCase} hrefPrefix="/client/cases" />
          ))}
          {!snapshot.cases.length ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">You do not have any cases yet. Create one to start uploading documents and requesting lawyer review.</CardContent></Card>
          ) : null}
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium">Next best action</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Open a case, upload your strongest document first, then review the generated timeline and request a lawyer only after the facts look organized.
              </p>
            </CardContent>
          </Card>
          <div>
            <h2 className="mb-4 text-xl font-semibold">Upcoming deadlines</h2>
            <DeadlineBoard deadlines={snapshot.deadlines} />
          </div>
          <div>
            <h2 className="mb-4 text-xl font-semibold">Latest timeline signals</h2>
            <TimelineView items={snapshot.timeline} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
