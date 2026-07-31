import { AppShell } from "@/components/workspace/app-shell";
import { CaseCard } from "@/components/workspace/case-card";
import { LiveCaseCreate } from "@/components/workspace/live-case-create";
import { SectionHeader } from "@/components/workspace/section-header";
import { LAWYER_NAV } from "@/lib/constants";
import { getCasesForRole } from "@/lib/data-access";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function LawyerCasesPage() {
  const user = await getCurrentUserWithProfile();
  const cases = await getCasesForRole("LAWYER");

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/cases" user={user!}>
      <SectionHeader
        eyebrow="Case Queue"
        title="Accepted and private matters"
        description="Create a private lawyer-owned matter, or open accepted client matters to review evidence, draft, and manage legal progress."
        action={<div />}
      />
      <div className="mb-6">
        <LiveCaseCreate role="LAWYER" />
      </div>
      <div className="space-y-5">
        {cases.map((legalCase: any) => (
          <CaseCard key={legalCase.id} legalCase={legalCase} hrefPrefix="/lawyer/cases" />
        ))}
      </div>
    </AppShell>
  );
}
