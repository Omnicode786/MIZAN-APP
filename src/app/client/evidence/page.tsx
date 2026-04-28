import Link from "next/link";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AiTranslationActions } from "@/components/ai-translation-actions";
import { CLIENT_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FormattedAiContent } from "@/utils/ai-content";

export default async function ClientEvidencePage() {
  const user = await getCurrentUserWithProfile();
  const clientProfileId = user?.clientProfile?.id;
  const documents = await prisma.document.findMany({
    where: clientProfileId ? { case: { clientProfileId } } : { id: "__NO_ACCESS__" },
    select: {
      id: true,
      caseId: true,
      fileName: true,
      fileType: true,
      mimeType: true,
      aiSummary: true,
      probableCategory: true,
      confidence: true,
      createdAt: true,
      case: {
        select: {
          id: true,
          title: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/evidence" user={user!}>
      <SectionHeader
        eyebrow="Evidence Vault"
        title="Searchable case evidence"
        description="Each uploaded document is summarized, tagged, and linked back to the matter where it belongs."
        action={<Button asChild><Link href="/client/cases">Open case workspace</Link></Button>}
      />
      <div className="grid gap-4">
        {documents.map((document) => (
          <Card key={document.id} className="soft-hover">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{document.fileName}</p>
                  <p className="text-sm text-muted-foreground">{document.case.title}</p>
                </div>
                <Badge variant="outline">{document.fileType}</Badge>
              </div>
             
              {document.aiSummary ? (
                <div className="mt-4">
                  <FormattedAiContent content={document.aiSummary} />
                  <AiTranslationActions text={document.aiSummary} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!documents.length ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No evidence documents found yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
