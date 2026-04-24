import { notFound } from "next/navigation";
import { AppShell } from "@/components/workspace/app-shell";
import { CaseWorkspaceLive } from "@/components/workspace/case-workspace-live";
import { SectionHeader } from "@/components/workspace/section-header";
import { LAWYER_NAV } from "@/lib/constants";
import { getCaseDetail } from "@/lib/data-access";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function LawyerCaseDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserWithProfile();
  const detail = await getCaseDetail(params.id);
  if (!user || !detail) notFound();

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/cases" user={user}>
      <SectionHeader
        eyebrow="Review Workspace"
        title={detail.title}
        description="Review evidence, send a proposal, keep internal notes, challenge the file in debate mode, and verify drafts when they are ready."
        action={<div />}
      />
      <CaseWorkspaceLive initialCase={detail} role="LAWYER" currentUser={user} />
    </AppShell>
  );
}
