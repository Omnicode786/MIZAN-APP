import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  getExpiredSessionCookieOptions,
  verifySessionToken,
  type SessionPayload
} from "@/lib/session";

const PROTECTED_PREFIXES = ["/client", "/lawyer", "/settings", "/search", "/notifications", "/redaction"];
const AUTH_PAGES = ["/login", "/signup"];

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dashboardForRole(role: SessionPayload["role"]) {
  if (role === "LAWYER") return "/lawyer/dashboard";
  if (role === "ADMIN") return "/lawyer/dashboard";
  return "/client/dashboard";
}

function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", getExpiredSessionCookieOptions());
}

function addSecurityHeaders(response: NextResponse, isProtected: boolean, requestId?: string) {
  if (requestId) {
    response.headers.set("x-request-id", requestId);
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  if (isProtected) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }

  return response;
}

function nextResponseWithRequestId(request: NextRequest, requestId: string) {
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  return NextResponse.next({
    request: {
      headers
    }
  });
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAuthPage(pathname: string) {
  return AUTH_PAGES.includes(pathname);
}

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isStateChangingRequest(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function hasTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function safeNextPath(request: NextRequest) {
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", safeNextPath(request));

  const response = NextResponse.redirect(url);
  clearSession(response);
  return response;
}

function redirectToDashboard(request: NextRequest, session: SessionPayload) {
  const url = request.nextUrl.clone();
  url.pathname = dashboardForRole(session.role);
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = isProtectedPath(pathname);
  const isApi = isApiPath(pathname);
  const requestId = request.headers.get("x-request-id") || createRequestId();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (isApi && isStateChangingRequest(request.method) && !hasTrustedOrigin(request)) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden." }, { status: 403 }), true, requestId);
  }

  if (isProtected && !session) {
    return addSecurityHeaders(redirectToLogin(request), true, requestId);
  }

  if (token && !session) {
    const response = nextResponseWithRequestId(request, requestId);
    clearSession(response);
    return addSecurityHeaders(response, isProtected || isApi, requestId);
  }

  if (session && isAuthPage(pathname)) {
    return addSecurityHeaders(redirectToDashboard(request, session), false, requestId);
  }

  if (session && pathname.startsWith("/client") && session.role !== "CLIENT") {
    return addSecurityHeaders(redirectToDashboard(request, session), true, requestId);
  }

  if (session && pathname.startsWith("/lawyer") && session.role !== "LAWYER" && session.role !== "ADMIN") {
    return addSecurityHeaders(redirectToDashboard(request, session), true, requestId);
  }

  return addSecurityHeaders(nextResponseWithRequestId(request, requestId), isProtected || isApi, requestId);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/client/:path*",
    "/lawyer/:path*",
    "/settings/:path*",
    "/search/:path*",
    "/notifications/:path*",
    "/redaction/:path*",
    "/login",
    "/signup"
  ]
};
