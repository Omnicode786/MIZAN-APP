import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  getExpiredSessionCookieOptions,
  getSessionCookieOptions,
  signSessionToken,
  verifySessionToken,
  type SessionPayload
} from "@/lib/session";

export type { SessionPayload };

export async function createSession(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  cookies().set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

  return token;
}

export function destroySession() {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", getExpiredSessionCookieOptions());
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

export async function getCurrentUserWithProfile() {
  const session = await getSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      clientProfile: true,
      lawyerProfile: true
    }
  });
}
