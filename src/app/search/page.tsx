import { redirect } from "next/navigation";
import { GlobalSearchPanel } from "@/components/workspace/global-search-panel";
import { SearchInvestigationPanel } from "@/components/workspace/search-investigation-panel";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { CLIENT_NAV, LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { buildAccessibleCaseWhereForUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function SearchPage({
  searchParams
}: {
  searchParams?: {
    q?: string | string[];
    category?: string | string[];
  };
}) {
  const user = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const initialQuery = readSearchParam(searchParams?.q);
  const initialCategory = readSearchParam(searchParams?.category);

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
        eyebrow="Search"
        title="Find anything in your legal workspace"
        description="Search cases, evidence, lawyers, documents, deadlines, drafts, and shared case information from one secure place."
      />
      <GlobalSearchPanel
        initialQuery={initialQuery}
        initialCategory={initialCategory}
        userRole={user.role}
      />

      <details className="group mt-6 rounded-3xl border border-border/70 bg-card/70 p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
          Advanced evidence investigation console
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            Search extracted document text and evidence internals
          </span>
        </summary>
        <div className="mt-5">
          <SearchInvestigationPanel cases={cases} />
        </div>
      </details>
    </AppShell>
  );
}
