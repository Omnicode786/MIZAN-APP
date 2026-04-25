import { notFound } from "next/navigation";
import { AppShell } from "@/components/workspace/app-shell";
import { ClientAiAssistant } from "@/components/workspace/client-ai-assistant";
import { SectionHeader } from "@/components/workspace/section-header";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { CLIENT_NAV } from "@/lib/constants";
import { sanitizeAssistantThreads } from "@/lib/data-access";
import { prisma } from "@/lib/prisma";

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
    include: {
      messages: { orderBy: { createdAt: "asc" } }
    }
  });

  const safeThreads = sanitizeAssistantThreads(threads).map((thread) => ({
    id: thread.id,
    title: thread.title,
    caseId: thread.caseId,
    documentId: thread.documentId,
    scope: thread.scope,
    messages: thread.messages.map((message) => ({
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
        action={<div />}
      />
      <ClientAiAssistant cases={caseOptions} initialThreads={safeThreads} />
    </AppShell>
  );
}
