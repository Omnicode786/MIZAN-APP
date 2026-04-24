import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  firmName: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  yearsExperience: z.number().int().min(0).optional(),
  hourlyRate: z.number().nullable().optional(),
  fixedFeeFrom: z.number().nullable().optional(),
  isPublic: z.boolean().optional(),
  city: z.string().optional(),
  name: z.string().optional()
});

export async function GET() {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "LAWYER" || !user.lawyerProfile) {
    return NextResponse.json({ error: "Lawyer profile not found." }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      ...user.lawyerProfile,
      user: { id: user.id, name: user.name, email: user.email }
    }
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "LAWYER" || !user.lawyerProfile) {
    return NextResponse.json({ error: "Lawyer profile not found." }, { status: 404 });
  }

  const body = schema.parse(await request.json());
  if (body.name) {
    await prisma.user.update({ where: { id: user.id }, data: { name: body.name } });
  }

  const profile = await prisma.lawyerProfile.update({
    where: { id: user.lawyerProfile.id },
    data: {
      firmName: body.firmName,
      bio: body.bio,
      specialties: body.specialties,
      yearsExperience: body.yearsExperience,
      hourlyRate: body.hourlyRate === undefined ? undefined : body.hourlyRate,
      fixedFeeFrom: body.fixedFeeFrom === undefined ? undefined : body.fixedFeeFrom,
      isPublic: body.isPublic,
      city: body.city
    },
    include: { user: true }
  });

  return NextResponse.json({ profile });
}
