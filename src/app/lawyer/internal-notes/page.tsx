import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LawyerInternalNotesPage() {
  const user = await getCurrentUserWithProfile();
  const lawyerProfileId = user?.lawyerProfile?.id;
  const notes = await prisma.internalNote.findMany({
    where: lawyerProfileId
      ? { case: { assignments: { some: { lawyerProfileId } } } }
      : { id: "__NO_ACCESS__" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      case: {
        select: {
          id: true,
          title: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/internal-notes" user={user!}>
      <SectionHeader
        eyebrow="Internal Notes"
        title="Lawyer-only notes across assigned matters"
        description="Open the relevant case workspace to add a new internal note or update your matter strategy."
        action={<Button asChild variant="outline"><Link href="/lawyer/cases">Open case queue</Link></Button>}
      />
      <div className="grid gap-4">
        {notes.map((note) => (
          <Card key={note.id}><CardContent className="p-5"><p className="font-medium">{note.case.title}</p><p className="mt-3 text-sm text-muted-foreground">{note.body}</p></CardContent></Card>
        ))}
      </div>
    </AppShell>
  );
}
