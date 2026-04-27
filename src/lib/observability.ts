import { AsyncLocalStorage } from "node:async_hooks";
import { NextResponse } from "next/server";

type LogLevel = "debug" | "info" | "warn" | "error";

export type ObservabilityContext = {
  requestId?: string | null;
  route?: string | null;
  method?: string | null;
  userId?: string | null;
  caseId?: string | null;
  documentId?: string | null;
  feature?: string | null;
};

type RouteStats = {
  count: number;
  errorCount: number;
  totalMs: number;
  maxMs: number;
  lastStatus?: number;
  lastSeenAt?: string;
};

type AiCostStats = {
  count: number;
  errorCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  lastSeenAt?: string;
};

type EventStats = {
  count: number;
  errorCount: number;
  lastSeenAt?: string;
};

type ObservabilityState = {
  routes: Record<string, RouteStats>;
  ai: Record<string, AiCostStats>;
  queue: Record<string, EventStats>;
  storage: Record<string, EventStats>;
  exports: Record<string, EventStats>;
};

const globalForObservability = globalThis as unknown as {
  mizanObservability?: ObservabilityState;
};

const store = new AsyncLocalStorage<ObservabilityContext>();

const state =
  globalForObservability.mizanObservability ||
  (globalForObservability.mizanObservability = {
    routes: {},
    ai: {},
    queue: {},
    storage: {},
    exports: {}
  });

const SENSITIVE_KEY_PATTERN = /(secret|token|password|apikey|api_key|authorization|cookie|jwt|database_url|cloudinary_url)/i;

function nowIso() {
  return new Date().toISOString();
}

export function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getObservabilityContext() {
  return store.getStore() || {};
}

export function runWithObservabilityContext<T>(context: ObservabilityContext, fn: () => T) {
  return store.run({ ...getObservabilityContext(), ...context }, fn);
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[Truncated]";
  if (typeof value === "string") return value.length > 600 ? `${value.slice(0, 600)}...` : value;
  if (typeof value === "number" || typeof value === "boolean" || value === null || typeof value === "undefined") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? "[Redacted]" : sanitize(item, depth + 1)
      ])
    );
  }
  return String(value);
}

export function logEvent(level: LogLevel, event: string, metadata: Record<string, unknown> = {}) {
  const context = getObservabilityContext();
  const payload = sanitize({
    timestamp: nowIso(),
    level,
    event,
    ...context,
    ...metadata
  });

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function trackError(scope: string, error: unknown, metadata: Record<string, unknown> = {}) {
  const normalized =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: "UnknownError", message: String(error) };

  logEvent("error", "error.tracked", {
    scope,
    error: normalized,
    ...metadata
  });
}

function observeRoute(route: string, durationMs: number, status: number) {
  const item = (state.routes[route] ||= { count: 0, errorCount: 0, totalMs: 0, maxMs: 0 });
  item.count += 1;
  item.totalMs += durationMs;
  item.maxMs = Math.max(item.maxMs, durationMs);
  item.lastStatus = status;
  item.lastSeenAt = nowIso();
  if (status >= 500) item.errorCount += 1;
}

export async function withApiObservability(
  request: Request,
  context: ObservabilityContext,
  handler: () => Promise<Response> | Response
) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") || createRequestId();
  const route = context.route || new URL(request.url).pathname;
  const method = context.method || request.method;

  return runWithObservabilityContext({ ...context, requestId, route, method }, async () => {
    logEvent("info", "api.request.start");

    try {
      const response = await handler();
      const durationMs = Date.now() - startedAt;
      observeRoute(route || "unknown", durationMs, response.status);
      try {
        response.headers.set("x-request-id", requestId);
        response.headers.set("server-timing", `app;dur=${durationMs}`);
        response.headers.set("cache-control", response.headers.get("cache-control") || "no-store");
      } catch {
        // Some Response implementations may expose immutable headers.
      }
      logEvent(response.status >= 500 ? "error" : "info", "api.request.complete", {
        status: response.status,
        durationMs
      });
      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      observeRoute(route || "unknown", durationMs, 500);
      trackError("api.unhandled", error, { durationMs });
      throw error;
    }
  });
}

export function estimateTokens(text?: string | null) {
  return Math.ceil((text || "").length / 4);
}

function estimateAiCostUsd(provider: string, model: string, inputTokens: number, outputTokens: number) {
  const key = `${provider}:${model}`.toLowerCase();
  const pricing =
    key.includes("openai")
      ? { inputPerMillion: 0.4, outputPerMillion: 1.6 }
      : key.includes("gemini")
        ? { inputPerMillion: 0.15, outputPerMillion: 0.6 }
        : { inputPerMillion: 0, outputPerMillion: 0 };

  return (inputTokens / 1_000_000) * pricing.inputPerMillion + (outputTokens / 1_000_000) * pricing.outputPerMillion;
}

export function recordAiUsage(input: {
  provider: string;
  model: string;
  feature?: string | null;
  userId?: string | null;
  caseId?: string | null;
  documentId?: string | null;
  prompt?: string | null;
  context?: string | null;
  output?: string | null;
  durationMs: number;
  success: boolean;
}) {
  const context = getObservabilityContext();
  const feature = input.feature || context.feature || "ai";
  const userId = input.userId || context.userId || "anonymous";
  const caseId = input.caseId || context.caseId || "none";
  const key = `${feature}|${userId}|${caseId}|${input.provider}|${input.model}`;
  const inputTokens = estimateTokens(`${input.prompt || ""}\n${input.context || ""}`);
  const outputTokens = estimateTokens(input.output);
  const estimatedCostUsd = estimateAiCostUsd(input.provider, input.model, inputTokens, outputTokens);
  const item = (state.ai[key] ||= {
    count: 0,
    errorCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0
  });

  item.count += 1;
  item.inputTokens += inputTokens;
  item.outputTokens += outputTokens;
  item.estimatedCostUsd += estimatedCostUsd;
  item.lastSeenAt = nowIso();
  if (!input.success) item.errorCount += 1;

  logEvent(input.success ? "info" : "error", "ai.usage", {
    provider: input.provider,
    model: input.model,
    feature,
    userId,
    caseId,
    documentId: input.documentId || context.documentId || null,
    inputTokens,
    outputTokens,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(8)),
    durationMs,
    success: input.success
  });
}

function recordBucket(bucket: keyof Pick<ObservabilityState, "queue" | "storage" | "exports">, key: string, success: boolean) {
  const item = (state[bucket][key] ||= { count: 0, errorCount: 0 });
  item.count += 1;
  item.lastSeenAt = nowIso();
  if (!success) item.errorCount += 1;
}

export function recordQueueMetric(action: string, status: string, metadata: Record<string, unknown> = {}) {
  recordBucket("queue", `${action}:${status}`, status !== "FAILED");
  logEvent(status === "FAILED" ? "error" : "info", "queue.agent_action", { action, status, ...metadata });
}

export function recordStorageMetric(operation: string, success: boolean, metadata: Record<string, unknown> = {}) {
  recordBucket("storage", operation, success);
  logEvent(success ? "info" : "error", "storage.operation", { operation, success, ...metadata });
}

export function recordExportMetric(operation: string, success: boolean, metadata: Record<string, unknown> = {}) {
  recordBucket("exports", operation, success);
  logEvent(success ? "info" : "error", "export.operation", { operation, success, ...metadata });
}

export function getObservabilitySnapshot() {
  const routes = Object.fromEntries(
    Object.entries(state.routes).map(([key, value]) => [
      key,
      {
        ...value,
        avgMs: value.count ? Math.round(value.totalMs / value.count) : 0
      }
    ])
  );

  return {
    generatedAt: nowIso(),
    routes,
    ai: state.ai,
    queue: state.queue,
    storage: state.storage,
    exports: state.exports
  };
}

export function jsonWithNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("cache-control", "no-store");
  return response;
}
