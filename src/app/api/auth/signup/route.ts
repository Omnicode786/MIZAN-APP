import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

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
  try {
    const body = schema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
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

    return NextResponse.json({
      ok: true,
      redirectTo: user.role === "LAWYER" ? "/lawyer/dashboard" : "/client/dashboard"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid signup request." },
      { status: 400 }
    );
  }
}
