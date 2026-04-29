import { AppShell } from "@/components/workspace/app-shell";
import { LawyerDirectory } from "@/components/workspace/lawyer-directory";
import { SectionHeader } from "@/components/workspace/section-header";
import { CLIENT_NAV } from "@/lib/constants";
import { getCasesForRole } from "@/lib/data-access";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function ClientLawyersPage() {
  const user = await getCurrentUserWithProfile();
  const cases = await getCasesForRole("CLIENT");

  return (
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/lawyers" user={user!}>
      <SectionHeader
        eyebrow="Find Lawyers"
        title="Search public lawyer profiles"
        description="Clients choose a specific lawyer. The lawyer must accept the request before full case details and contact information unlock."
        action={<div />}
      />
      <LawyerDirectory cases={cases} />
    </AppShell>
  );
}
