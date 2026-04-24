import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

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
    return handleApiError(error, "AUTH_LOGIN_ROUTE", "Unable to sign in.");
  }
}
