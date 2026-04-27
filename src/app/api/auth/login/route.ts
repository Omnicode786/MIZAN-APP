import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { logEvent, withApiObservability } from "@/lib/observability";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional()
});

function defaultRedirectForRole(role: "CLIENT" | "LAWYER" | "ADMIN") {
  return role === "LAWYER" || role === "ADMIN" ? "/lawyer/dashboard" : "/client/dashboard";
}

function safeRedirectForRole(nextPath: string | undefined, role: "CLIENT" | "LAWYER" | "ADMIN") {
  const fallback = defaultRedirectForRole(role);
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) return fallback;
  if (nextPath.startsWith("/api") || nextPath.startsWith("/login") || nextPath.startsWith("/signup")) return fallback;
  if (nextPath.startsWith("/client") && role !== "CLIENT") return fallback;
  if (nextPath.startsWith("/lawyer") && role !== "LAWYER" && role !== "ADMIN") return fallback;
  return nextPath;
}

export async function POST(request: Request) {
  return withApiObservability(request, { route: "/api/auth/login", feature: "auth" }, async () => {
    try {
      const body = schema.parse(await request.json());

      const user = await prisma.user.findUnique({
        where: { email: body.email }
      });

      if (!user) {
        logEvent("warn", "auth.login_failed", { reason: "unknown_user" });
        return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "cache-control": "no-store" } });
      }

      const valid = await bcrypt.compare(body.password, user.passwordHash);

      if (!valid) {
        logEvent("warn", "auth.login_failed", { reason: "invalid_password", userId: user.id });
        return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "cache-control": "no-store" } });
      }

      await createSession({
        sub: user.id,
        role: user.role,
        name: user.name,
        email: user.email
      });

      logEvent("info", "auth.login_success", { userId: user.id, role: user.role });

      return NextResponse.json(
        {
          ok: true,
          redirectTo: safeRedirectForRole(body.next, user.role)
        },
        { headers: { "cache-control": "no-store" } }
      );
    } catch (error) {
      return handleApiError(error, "AUTH_LOGIN_ROUTE", "Unable to sign in.");
    }
  });
}
