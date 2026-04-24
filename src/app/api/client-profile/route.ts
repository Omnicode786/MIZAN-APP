import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  phone: z.string().optional(),
  region: z.string().optional(),
  simpleLanguageMode: z.boolean().optional(),
  name: z.string().optional()
});

export async function GET() {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "CLIENT" || !user.clientProfile) {
    return NextResponse.json({ error: "Client profile not found." }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      ...user.clientProfile,
      user: { id: user.id, name: user.name, email: user.email }
    }
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "CLIENT" || !user.clientProfile) {
    return NextResponse.json({ error: "Client profile not found." }, { status: 404 });
  }

  const body = schema.parse(await request.json());
  if (body.name) {
    await prisma.user.update({ where: { id: user.id }, data: { name: body.name } });
  }

  const profile = await prisma.clientProfile.update({
    where: { id: user.clientProfile.id },
    data: {
      phone: body.phone,
      region: body.region,
      simpleLanguageMode: body.simpleLanguageMode
    },
    include: { user: true }
  });

  return NextResponse.json({ profile });
}
