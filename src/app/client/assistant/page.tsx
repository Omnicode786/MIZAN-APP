import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/workspace/app-shell";
import { ClientAiAssistant } from "@/components/workspace/client-ai-assistant";
import { SectionHeader } from "@/components/workspace/section-header";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { CLIENT_NAV } from "@/lib/constants";
import { sanitizeAssistantThreads } from "@/lib/data-access";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ClientAssistantPage() {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "CLIENT" || !user.clientProfile) notFound();

  const cases = await prisma.case.findMany({
    where: { clientProfileId: user.clientProfile.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      stage: true,
      documents: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { fileName: true }
      },
      _count: {
        select: {
          documents: true,
          evidenceItems: true,
          deadlines: true
        }
      }
    }
  });

  const caseIds = cases.map((item) => item.id);
  const threads = await prisma.assistantThread.findMany({
    where: {
      createdById: user.id,
      OR: [
        { caseId: null, documentId: null },
        { caseId: { in: caseIds }, documentId: null }
      ]
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      caseId: true,
      documentId: true,
      scope: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const threadIds = threads.map((thread) => thread.id);
  const messageRows = threadIds.length
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          threadId: string;
          role: string;
          content: string;
          confidence: number | null;
          sources: unknown;
          createdAt: Date;
        }>
      >(Prisma.sql`
        SELECT
          ranked."id",
          ranked."threadId",
          ranked."role"::text AS "role",
          ranked."content",
          ranked."confidence",
          ranked."sources",
          ranked."createdAt"
        FROM (
          SELECT
            "id",
            "threadId",
            "role",
            "content",
            "confidence",
            "sources",
            "createdAt",
            ROW_NUMBER() OVER (PARTITION BY "threadId" ORDER BY "createdAt" DESC) AS rn
          FROM "AssistantMessage"
          WHERE "threadId" IN (${Prisma.join(threadIds)})
        ) ranked
        WHERE ranked.rn <= 6
        ORDER BY ranked."threadId" ASC, ranked."createdAt" DESC
      `)
    : [];

  const messagesByThreadId = new Map<string, typeof messageRows>();
  for (const message of messageRows) {
    const bucket = messagesByThreadId.get(message.threadId) || [];
    bucket.push(message);
    messagesByThreadId.set(message.threadId, bucket);
  }

  const threadsWithMessages = threads.map((thread) => ({
    ...thread,
    messages: messagesByThreadId.get(thread.id) || []
  }));

  const safeThreads = sanitizeAssistantThreads(threadsWithMessages).map((thread) => ({
    id: thread.id,
    title: thread.title,
    caseId: thread.caseId,
    documentId: thread.documentId,
    scope: thread.scope,
    messages: [...thread.messages].reverse().map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      confidence: message.confidence,
      sources: Array.isArray(message.sources)
        ? message.sources.filter((source): source is string => typeof source === "string")
        : []
    }))
  }));

  const caseOptions = cases.map((legalCase) => ({
    id: legalCase.id,
    title: legalCase.title,
    category: legalCase.category,
    status: legalCase.status,
    stage: legalCase.stage,
    documentCount: legalCase._count.documents,
    evidenceCount: legalCase._count.evidenceItems,
    deadlineCount: legalCase._count.deadlines,
    recentDocuments: legalCase.documents.map((document) => document.fileName)
  }));

  return (
    <AppShell nav={CLIENT_NAV} heading="Client Workspace" currentPath="/client/assistant" user={user}>
      <SectionHeader
        eyebrow="AI Legal Assistant"
        title="Ask general questions or attach a case"
        description="Switch between general legal questions and case-aware conversations from your client workspace."
        action={
          <Button asChild variant="outline">
            <Link href="/client/ai-workflows">Review AI workflows</Link>
          </Button>
        }
      />
      <ClientAiAssistant cases={caseOptions} initialThreads={safeThreads} />
    </AppShell>
  );
}
