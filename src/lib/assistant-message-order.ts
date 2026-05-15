import type { MessageRole, Prisma } from "@prisma/client";

export const assistantMessageAscendingOrder = [
  { sequence: "asc" as const },
  { createdAt: "asc" as const },
  { id: "asc" as const }
];

export const assistantMessageDescendingOrder = [
  { sequence: "desc" as const },
  { createdAt: "desc" as const },
  { id: "desc" as const }
];

type AssistantMessagePayload = {
  role: MessageRole;
  content: string;
  confidence?: number | null;
  sources?: Prisma.InputJsonValue;
};

type AssistantMessageWriter = {
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
  assistantMessage: {
    findFirst: (args: {
      where: { threadId: string };
      orderBy: typeof assistantMessageDescendingOrder;
      select: { sequence: true };
    }) => Promise<{ sequence: number } | null>;
    create: (args: { data: Prisma.AssistantMessageUncheckedCreateInput }) => Promise<{
      id: string;
      threadId: string;
      sequence: number;
      role: MessageRole;
      content: string;
      sources: Prisma.JsonValue | null;
      confidence: number | null;
      createdAt: Date;
    }>;
  };
};

export async function appendAssistantMessages(
  tx: AssistantMessageWriter,
  threadId: string,
  messages: AssistantMessagePayload[]
) {
  if (!messages.length) return [];

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${threadId}))`;

  const latestMessage = await tx.assistantMessage.findFirst({
    where: { threadId },
    orderBy: assistantMessageDescendingOrder,
    select: { sequence: true }
  });

  const startSequence = (latestMessage?.sequence ?? -1) + 1;
  const createdMessages = [];

  for (const [index, message] of messages.entries()) {
    const data: Prisma.AssistantMessageUncheckedCreateInput = {
      threadId,
      sequence: startSequence + index,
      role: message.role,
      content: message.content
    };

    if (typeof message.confidence === "number") {
      data.confidence = message.confidence;
    }

    if (message.sources !== undefined) {
      data.sources = message.sources;
    }

    createdMessages.push(await tx.assistantMessage.create({ data }));
  }

  return createdMessages;
}
