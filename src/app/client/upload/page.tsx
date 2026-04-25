import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { CaseCard } from "@/components/workspace/case-card";
import { SectionHeader } from "@/components/workspace/section-header";
import { Button } from "@/components/ui/button";
import { CLIENT_NAV } from "@/lib/constants";
import { getCasesForRole } from "@/lib/data-access";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function ClientUploadPage() {
  const user = await getCurrentUserWithProfile();
  const cases = await getCasesForRole("CLIENT");
  return (
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/upload" user={user!}>
      <SectionHeader
        eyebrow="Upload Center"
        title="Choose a case and upload into the live record"
        description="Uploads are handled inside the case workspace so they immediately update the timeline, evidence vault, and AI assistance context."
        action={<Button asChild><Link href="/client/cases">Open case workspace</Link></Button>}
      />
      <div className="space-y-5">
        {cases.map((legalCase: any) => (
          <CaseCard key={legalCase.id} legalCase={legalCase} hrefPrefix="/client/cases" />
        ))}
      </div>
    </AppShell>
  );
}
