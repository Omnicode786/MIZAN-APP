import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { logEvent, withApiObservability } from "@/lib/observability";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["CLIENT", "LAWYER"])
});

function uniqueSlug(input: string) {
  return `${input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export async function POST(request: Request) {
  return withApiObservability(request, { route: "/api/auth/signup", feature: "auth" }, async () => {
    try {
      const body = schema.parse(await request.json());

      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) {
        logEvent("warn", "auth.signup_failed", { reason: "existing_email" });
        return NextResponse.json({ error: "User already exists." }, { status: 409, headers: { "cache-control": "no-store" } });
      }

      const passwordHash = await bcrypt.hash(body.password, 10);
      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          passwordHash,
          role: body.role,
          clientProfile: body.role === "CLIENT" ? { create: {} } : undefined,
          lawyerProfile:
            body.role === "LAWYER"
              ? {
                  create: {
                    publicSlug: uniqueSlug(body.name),
                    specialties: [],
                    isPublic: false
                  }
                }
              : undefined
        }
      });

      await createSession({
        sub: user.id,
        role: user.role,
        name: user.name,
        email: user.email
      });

      logEvent("info", "auth.signup_success", { userId: user.id, role: user.role });

      return NextResponse.json(
        {
          ok: true,
          redirectTo: user.role === "LAWYER" ? "/lawyer/dashboard" : "/client/dashboard"
        },
        { headers: { "cache-control": "no-store" } }
      );
    } catch (error) {
      return handleApiError(error, "AUTH_SIGNUP_ROUTE", "Unable to create your account.");
    }
  });
}
