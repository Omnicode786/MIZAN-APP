import { prisma } from "@/lib/prisma";

export const FREE_AI_MONTHLY_CHAT_LIMIT = 50;
export const FREE_AI_MONTHLY_TOKEN_LIMIT = 100_000;

export class AiUsageLimitError extends Error {
  status = 429;

  constructor(message: string) {
    super(message);
    this.name = "AiUsageLimitError";
  }
}

export type AiUsageSummary = {
  planName: "Free";
  periodStart: Date;
  periodEnd: Date;
  chatsUsed: number;
  chatsLimit: number;
  chatsRemaining: number;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
};

function estimateTokens(text?: string | null) {
  return Math.ceil((text || "").length / 4);
}

export function getAiUsagePeriod(now = new Date()) {
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { periodStart, periodEnd };
}

export async function getAiUsageSummary(userId: string): Promise<AiUsageSummary> {
  const { periodStart, periodEnd } = getAiUsagePeriod();

  const messages = await prisma.assistantMessage.findMany({
    where: {
      createdAt: {
        gte: periodStart,
        lt: periodEnd
      },
      thread: {
        createdById: userId
      }
    },
    select: {
      role: true,
      content: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const chatsUsed = messages.filter((message) => message.role === "AI").length;
  const tokensUsed = messages.reduce((total, message) => total + estimateTokens(message.content), 0);

  return {
    planName: "Free",
    periodStart,
    periodEnd,
    chatsUsed,
    chatsLimit: FREE_AI_MONTHLY_CHAT_LIMIT,
    chatsRemaining: Math.max(FREE_AI_MONTHLY_CHAT_LIMIT - chatsUsed, 0),
    tokensUsed,
    tokensLimit: FREE_AI_MONTHLY_TOKEN_LIMIT,
    tokensRemaining: Math.max(FREE_AI_MONTHLY_TOKEN_LIMIT - tokensUsed, 0)
  };
}

export async function assertAiUsageAvailable(userId: string) {
  const summary = await getAiUsageSummary(userId);

  if (summary.chatsRemaining <= 0) {
    throw new AiUsageLimitError("You have used all free AI chats for this month. Upgrade your plan to continue.");
  }

  if (summary.tokensRemaining <= 0) {
    throw new AiUsageLimitError("You have used all free AI tokens for this month. Upgrade your plan to continue.");
  }

  return summary;
}
