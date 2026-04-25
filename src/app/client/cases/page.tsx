import { AppShell } from "@/components/workspace/app-shell";
import { CaseCard } from "@/components/workspace/case-card";
import { LiveCaseCreate } from "@/components/workspace/live-case-create";
import { SectionHeader } from "@/components/workspace/section-header";
import { CLIENT_NAV } from "@/lib/constants";
import { getCasesForRole } from "@/lib/data-access";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function ClientCasesPage() {
  const user = await getCurrentUserWithProfile();
  const cases = await getCasesForRole("CLIENT");

  return (
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/cases" user={user!}>
      <SectionHeader
        eyebrow="My Cases"
        title="Create and manage live legal matters"
        description="Every case gets its own timeline, evidence vault, deadlines, AI help, draft history, and lawyer request flow."
        action={<div />}
      />
      <div className="mb-6">
        <LiveCaseCreate />
      </div>
      <div className="space-y-5">
        {cases.map((legalCase: any) => (
          <CaseCard key={legalCase.id} legalCase={legalCase} hrefPrefix="/client/cases" />
        ))}
      </div>
    </AppShell>
  );
}
