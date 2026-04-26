import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

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
  try {
    const body = schema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await createSession({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    });

    return NextResponse.json({
      ok: true,
      redirectTo: safeRedirectForRole(body.next, user.role)
    });
  } catch (error) {
    return handleApiError(error, "AUTH_LOGIN_ROUTE", "Unable to sign in.");
  }
}
