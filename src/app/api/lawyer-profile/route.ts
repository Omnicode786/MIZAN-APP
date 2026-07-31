import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, notFound } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  firmName: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  jurisdictions: z.array(z.string()).optional(),
  consultationTypes: z.array(z.string()).optional(),
  availability: z.string().optional(),
  searchable: z.boolean().optional(),
  barRegistration: z.string().nullable().optional(),
  yearsExperience: z.number().int().min(0).optional(),
  hourlyRate: z.number().nullable().optional(),
  fixedFeeFrom: z.number().nullable().optional(),
  isPublic: z.boolean().optional(),
  city: z.string().optional(),
  name: z.string().optional()
});

export async function GET() {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user || user.role !== "LAWYER" || !user.lawyerProfile) return notFound();

    return NextResponse.json({
      profile: {
        ...user.lawyerProfile,
        user: { id: user.id, name: user.name, email: user.email }
      }
    });
  } catch (error) {
    return handleApiError(error, "LAWYER_PROFILE_GET_ROUTE", "Unable to load profile.");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user || user.role !== "LAWYER" || !user.lawyerProfile) return notFound();

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
        languages: body.languages,
        jurisdictions: body.jurisdictions,
        consultationTypes: body.consultationTypes,
        availability: body.availability,
        searchable: body.searchable,
        barRegistration: body.barRegistration === undefined ? undefined : body.barRegistration || null,
        yearsExperience: body.yearsExperience,
        hourlyRate: body.hourlyRate === undefined ? undefined : body.hourlyRate,
        fixedFeeFrom: body.fixedFeeFrom === undefined ? undefined : body.fixedFeeFrom,
        isPublic: body.isPublic,
        city: body.city
      },
      select: {
        id: true,
        userId: true,
        firmName: true,
        bio: true,
        specialties: true,
        languages: true,
        jurisdictions: true,
        consultationTypes: true,
        availability: true,
        searchable: true,
        barRegistration: true,
        yearsExperience: true,
        hourlyRate: true,
        fixedFeeFrom: true,
        rating: true,
        verifiedBadge: true,
        city: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return handleApiError(error, "LAWYER_PROFILE_UPDATE_ROUTE", "Unable to update profile.");
  }
}
