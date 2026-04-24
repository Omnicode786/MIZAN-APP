import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CLIENT_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientCollaborationPage() {
  const user = await getCurrentUserWithProfile();
  const comments = await prisma.comment.findMany({
    where: { case: { clientProfileId: user?.clientProfile?.id }, visibility: "SHARED" },
    include: { author: true, case: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/collaboration" user={user!}>
      <SectionHeader
        eyebrow="Collaboration"
        title="Shared discussion across cases"
        description="Communication is structured by case. Open the relevant case workspace to reply, upload more proof, or review a proposal."
        action={<Button asChild><Link href="/client/cases">Open case workspace</Link></Button>}
      />
      <div className="grid gap-4">
        {comments.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.case.title}</p>
                  <p className="text-sm text-muted-foreground">{item.author.name}</p>
                </div>
                <Badge variant="secondary">{item.visibility}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
