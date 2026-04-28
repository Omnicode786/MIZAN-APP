import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { destroySession } from "@/lib/auth";
import { SESSION_COOKIE_NAME, getExpiredSessionCookieOptions } from "@/lib/session";
import { logEvent, withApiObservability } from "@/lib/observability";

export async function POST(request: Request) {
  return withApiObservability(request, { route: "/api/auth/logout", feature: "auth" }, async () => {
    try {
      destroySession();
      const response = NextResponse.json({ ok: true });
      response.cookies.set(SESSION_COOKIE_NAME, "", getExpiredSessionCookieOptions());
      response.headers.set("cache-control", "no-store, max-age=0");
      response.headers.set("pragma", "no-cache");
      response.headers.set("expires", "0");
      response.headers.set("clear-site-data", "\"cookies\"");
      logEvent("info", "auth.logout");
      return response;
    } catch (error) {
      return handleApiError(error, "AUTH_LOGOUT_ROUTE", "Unable to sign out.");
    }
  });
}
