import { redirect } from "next/navigation";
import { SearchInvestigationPanel } from "@/components/workspace/search-investigation-panel";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { CLIENT_NAV, LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { buildAccessibleCaseWhereForUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function SearchPage() {
  const user = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const cases = await prisma.case.findMany({
    where: buildAccessibleCaseWhereForUser(user),
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
