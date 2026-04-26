import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  sub: string;
  role: "CLIENT" | "LAWYER" | "ADMIN";
  name: string;
  email: string;
  sid?: string;
};

export const SESSION_COOKIE_NAME = "mizan_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const SESSION_ISSUER = "mizan";
const SESSION_AUDIENCE = "mizan-app";
const FALLBACK_DEV_SECRET = "mizan-dev-secret-key-change-before-production";

function getSessionSecret() {
  const secret = process.env.JWT_SECRET || FALLBACK_DEV_SECRET;

  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.JWT_SECRET || secret.length < 32 || secret.includes("replace-me") || secret === FALLBACK_DEV_SECRET)
  ) {
    throw new Error("JWT_SECRET must be set to a strong value in production.");
  }

  return new TextEncoder().encode(secret);
}

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getSessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    priority: "high" as const
  };
}

export function getExpiredSessionCookieOptions() {
  return {
    ...getSessionCookieOptions(0),
    expires: new Date(0)
  };
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT({
    ...payload,
    sid: payload.sid || createSessionId()
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "CLIENT" && payload.role !== "LAWYER" && payload.role !== "ADMIN")
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      sid: typeof payload.sid === "string" ? payload.sid : undefined
    };
  } catch {
    return null;
  }
}
