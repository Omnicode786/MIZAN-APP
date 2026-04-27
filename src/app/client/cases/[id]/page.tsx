import { notFound } from "next/navigation";
import { AppShell } from "@/components/workspace/app-shell";
import { CaseWorkspaceLive } from "@/components/workspace/case-workspace-live";
import { SectionHeader } from "@/components/workspace/section-header";
import { CLIENT_NAV } from "@/lib/constants";
import { getCaseDetail } from "@/lib/data-access";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function ClientCaseDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserWithProfile();
  const detail = await getCaseDetail(params.id);
  if (!user || !detail) notFound();

  return (
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/cases" user={user}>
      <SectionHeader
        eyebrow="Case Workspace"
        title=""
        description="Live case workspace with document intelligence, grounded assistance, deadlines, drafts, and lawyer collaboration."
        action={<div />}
      />
      <CaseWorkspaceLive initialCase={detail} role="CLIENT" currentUser={user} simpleLanguageMode={user.clientProfile?.simpleLanguageMode} />
    </AppShell>
  );
}
