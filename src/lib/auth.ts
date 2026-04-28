import { cache } from "react";
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

export const getSession = cache(async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
});

export const getCurrentUserWithProfile = cache(async function getCurrentUserWithProfile() {
  const session = await getSession();
  if (!session) return null;

  const userQuery = prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true
    }
  });

  const clientProfileQuery =
    session.role === "CLIENT"
      ? prisma.clientProfile.findUnique({
          where: { userId: session.sub },
          select: {
            id: true,
            userId: true,
            phone: true,
            region: true,
            simpleLanguageMode: true
          }
        })
      : Promise.resolve(null);

  const lawyerProfileQuery =
    session.role === "LAWYER"
      ? prisma.lawyerProfile.findUnique({
          where: { userId: session.sub },
          select: {
            id: true,
            userId: true,
            publicSlug: true,
            firmName: true,
            bio: true,
            specialties: true,
            yearsExperience: true,
            hourlyRate: true,
            fixedFeeFrom: true,
            isPublic: true,
            verifiedBadge: true,
            rating: true,
            city: true
          }
        })
      : Promise.resolve(null);

  const [user, clientProfile, lawyerProfile] = await Promise.all([
    userQuery,
    clientProfileQuery,
    lawyerProfileQuery
  ]);

  if (!user) return null;

  return {
    ...user,
    clientProfile,
    lawyerProfile
  };
});
