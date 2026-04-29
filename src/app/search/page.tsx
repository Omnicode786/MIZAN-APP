import { redirect } from "next/navigation";
import { SearchInvestigationPanel } from "@/components/workspace/search-investigation-panel";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { CLIENT_NAV, LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SearchPage() {
  const user = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const lawyerProfileId = user.lawyerProfile?.id;
  const clientProfileId = user.clientProfile?.id;
  const cases = await prisma.case.findMany({
    where: user.role === 'LAWYER'
      ? lawyerProfileId
        ? { assignments: { some: { lawyerProfileId, status: "ACCEPTED" as const } } }
        : { id: "__NO_ACCESS__" }
      : clientProfileId
        ? { clientProfileId }
        : { id: "__NO_ACCESS__" },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      updatedAt: true,
      _count: {
        select: {
          documents: true,
          evidenceItems: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 40
  });

  return (
    <AppShell nav={user.role === 'LAWYER' ? LAWYER_NAV : CLIENT_NAV} heading="Shared" currentPath="/search" user={user}>
      <SectionHeader
        eyebrow="Evidence Search"
        title="Investigation-style search across uploaded evidence"
        description="Search mentions of payments, threats, dates, names, and clauses without defaulting to a generic chat flow."
      />
      <SearchInvestigationPanel cases={cases} />
    </AppShell>
  );
}
