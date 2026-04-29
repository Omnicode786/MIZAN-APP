import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getObservabilityContext, trackError } from "@/lib/observability";

export function apiError(message: string, status: number) {
  const response = NextResponse.json({ error: message }, { status });
  const requestId = getObservabilityContext().requestId;
  if (requestId) response.headers.set("x-request-id", requestId);
  response.headers.set("cache-control", "no-store");
  return response;
}

export function unauthorized() {
  return apiError("Unauthorized.", 401);
}

export function forbidden() {
  return apiError("Forbidden.", 403);
}

export function notFound() {
  return apiError("Not found.", 404);
}

export function validationError(message = "Invalid request.") {
  return apiError(message, 400);
}

export function handleApiError(
  error: unknown,
  scope: string,
  fallback = "Something went wrong. Please try again."
) {
  trackError(scope, error);

  if (error instanceof ZodError) {
    return validationError("Invalid request.");
  }

  if (error instanceof Error && error.name === "AiProviderError") {
    return apiError("AI service is temporarily unavailable. Please try again.", 502);
  }

  if (error instanceof Error && error.name === "AiUsageLimitError") {
    return apiError(error.message, 429);
  }

  if (error instanceof Error) {
    if (error.message === "Unauthorized") return unauthorized();
    if (error.message === "Forbidden") return forbidden();
    if (error.message === "Not found") return notFound();
  }

  return apiError(fallback, 500);
}
