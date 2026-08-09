import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  getExpiredSessionCookieOptions,
  verifySessionToken,
  type SessionPayload
} from "@/lib/session";

const PROTECTED_PREFIXES = ["/client", "/lawyer", "/settings", "/search", "/notifications", "/redaction", "/ops"];
const AUTH_PAGES = ["/login", "/signup"];
const LEGACY_PUBLIC_FILE_PREFIXES = ["/uploads", "/exports", "/redactions"];
const MAX_MUTATION_BODY_BYTES = 25 * 1024 * 1024;

type RateLimitRule = {
  windowMs: number;
  max: number;
  name: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function getRateLimitRule(pathname: string, method: string): RateLimitRule | null {
  if (!pathname.startsWith("/api/")) return null;
  const upperMethod = method.toUpperCase();

  if (pathname === "/api/auth/login") return { name: "auth.login", windowMs: 60_000, max: 10 };
  if (pathname === "/api/auth/signup") return { name: "auth.signup", windowMs: 60_000, max: 6 };
  if (pathname.startsWith("/api/ai/")) return { name: "ai", windowMs: 60_000, max: 30 };
  if (pathname.startsWith("/api/documents/upload")) return { name: "uploads", windowMs: 10 * 60_000, max: 12 };
  if (pathname.startsWith("/api/search")) return { name: "search", windowMs: 60_000, max: 80 };
  if (upperMethod !== "GET" && upperMethod !== "HEAD" && upperMethod !== "OPTIONS") {
    return { name: "api.mutation", windowMs: 60_000, max: 90 };
  }

  return { name: "api.read", windowMs: 60_000, max: 240 };
}

function getClientIdentity(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  return cfIp || realIp || forwardedFor || "unknown";
}

function rateLimit(request: NextRequest, requestId: string) {
  const rule = getRateLimitRule(request.nextUrl.pathname, request.method);
  if (!rule) return null;

  const now = Date.now();
  const identity = getClientIdentity(request);
  const key = `${rule.name}:${identity}`;
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= rule.max) return null;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  const response = NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429 }
  );
  response.headers.set("Retry-After", String(retryAfter));
  response.headers.set("X-RateLimit-Limit", String(rule.max));
  response.headers.set("X-RateLimit-Remaining", "0");
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  return addSecurityHeaders(response, true, requestId);
}

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
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  const scriptSrc =
    process.env.NODE_ENV === "production" ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  const cspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com",
    "media-src 'self' blob: data: https://res.cloudinary.com",
    "worker-src 'self' blob:"
  ];
  if (process.env.NODE_ENV === "production") {
    cspDirectives.push("upgrade-insecure-requests");
  }
  response.headers.set(
    "Content-Security-Policy",
    cspDirectives.join("; ")
  );

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

function isLegacyPublicFilePath(pathname: string) {
  return LEGACY_PUBLIC_FILE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
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
    const trustedOrigins = new Set(
      [
        request.nextUrl.origin,
        ...(process.env.MIZAN_ALLOWED_ORIGINS || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      ].map((value) => new URL(value).origin)
    );
    return trustedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

function hasTrustedFetchMetadata(request: NextRequest) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (!secFetchSite) return true;
  return secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none";
}

function hasAcceptableMutationSize(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return true;
  const size = Number(contentLength);
  return Number.isFinite(size) && size <= MAX_MUTATION_BODY_BYTES;
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

  if (isLegacyPublicFilePath(pathname)) {
    return addSecurityHeaders(NextResponse.json({ error: "Not found." }, { status: 404 }), true, requestId);
  }

  const limited = rateLimit(request, requestId);
  if (limited) return limited;

  if (isApi && isStateChangingRequest(request.method) && !hasAcceptableMutationSize(request)) {
    return addSecurityHeaders(NextResponse.json({ error: "Request is too large." }, { status: 413 }), true, requestId);
  }

  if (isApi && isStateChangingRequest(request.method) && (!hasTrustedOrigin(request) || !hasTrustedFetchMetadata(request))) {
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
    "/ops/:path*",
    "/uploads/:path*",
    "/exports/:path*",
    "/redactions/:path*",
    "/login",
    "/signup"
  ]
};
