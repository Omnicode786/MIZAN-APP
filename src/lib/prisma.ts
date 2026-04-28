import { PrismaClient } from "@prisma/client";
import { logEvent, trackError } from "@/lib/observability";

const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy"
]);

function isTransientPrismaConnectionError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = error instanceof Error ? error.message : String(error || "");

  return (
    ["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code) ||
    /server has closed the connection/i.test(message) ||
    /connection.*forcibly closed/i.test(message) ||
    /connection reset/i.test(message) ||
    /postgresql connection.*closed/i.test(message) ||
    /kind:\s*closed/i.test(message) ||
    /terminating connection/i.test(message)
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTransientReadRetry<T>(
  client: PrismaClient,
  operationLabel: string,
  run: () => Promise<T>
) {
  const maxAttempts = Number(process.env.DB_TRANSIENT_RETRY_ATTEMPTS || 2);
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isTransientPrismaConnectionError(error) || attempt >= maxAttempts) {
        throw error;
      }

      logEvent("warn", "db.transient_retry", {
        operation: operationLabel,
        attempt: attempt + 1,
        maxAttempts,
        message: error instanceof Error ? error.message : String(error)
      });

      await client.$disconnect().catch(() => undefined);
      await delay(120 * 2 ** attempt);
    }
  }

  throw lastError;
}

function createPrismaWithRetry(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const operationName = String(operation);
          if (!READ_OPERATIONS.has(operationName)) {
            return query(args);
          }

          return withTransientReadRetry(client, `${model}.${operationName}`, () => query(args));
        }
      }
    }
  });
}

type PrismaWithRetry = ReturnType<typeof createPrismaWithRetry>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaWithRetry?: PrismaWithRetry;
  prismaObservabilityAttached?: boolean;
};

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "warn" },
      { emit: "event", level: "error" }
    ]
  });

export const prisma = globalForPrisma.prismaWithRetry ?? createPrismaWithRetry(prismaClient);

if (!globalForPrisma.prismaObservabilityAttached) {
  const client = prismaClient as PrismaClient & {
    $on(event: string, callback: (event: any) => void): void;
  };
  const defaultSlowQueryThresholdMs = process.env.NODE_ENV === "production" ? 500 : 1000;
  const configuredSlowQueryThresholdMs = process.env.DB_SLOW_QUERY_MS
    ? Number(process.env.DB_SLOW_QUERY_MS)
    : NaN;
  const slowQueryThresholdMs = Number.isFinite(configuredSlowQueryThresholdMs)
    ? configuredSlowQueryThresholdMs
    : defaultSlowQueryThresholdMs;

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
    if (isTransientPrismaConnectionError(event?.message)) {
      logEvent("warn", "db.connection_transient", {
        message: event?.message,
        target: event?.target
      });
      return;
    }

    trackError("db.prisma", new Error(event?.message || "Prisma error"), {
      target: event?.target
    });
  });

  globalForPrisma.prismaObservabilityAttached = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
  globalForPrisma.prismaWithRetry = prisma;
}
