import { PrismaClient } from "@prisma/client";
import { logEvent, trackError } from "@/lib/observability";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaObservabilityAttached?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "warn" },
      { emit: "event", level: "error" }
    ]
  });

if (!globalForPrisma.prismaObservabilityAttached) {
  const client = prisma as PrismaClient & {
    $on(event: string, callback: (event: any) => void): void;
  };
  const slowQueryThresholdMs = Number(process.env.DB_SLOW_QUERY_MS || 350);

  client.$on("query", (event) => {
    if (typeof event?.duration === "number" && event.duration >= slowQueryThresholdMs) {
      logEvent("warn", "db.slow_query", {
        durationMs: event.duration,
        target: event.target,
        query: String(event.query || "").slice(0, 900)
      });
    }
  });

  client.$on("warn", (event) => {
    logEvent("warn", "db.warning", {
      message: event?.message,
      target: event?.target
    });
  });

  client.$on("error", (event) => {
    trackError("db.prisma", new Error(event?.message || "Prisma error"), {
      target: event?.target
    });
  });

  globalForPrisma.prismaObservabilityAttached = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
