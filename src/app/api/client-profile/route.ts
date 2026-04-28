import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, notFound } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  phone: z.string().optional(),
  region: z.string().optional(),
  simpleLanguageMode: z.boolean().optional(),
  name: z.string().optional()
});

export async function GET() {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user || user.role !== "CLIENT" || !user.clientProfile) return notFound();

    return NextResponse.json({
      profile: {
        ...user.clientProfile,
        user: { id: user.id, name: user.name, email: user.email }
      }
    });
  } catch (error) {
    return handleApiError(error, "CLIENT_PROFILE_GET_ROUTE", "Unable to load profile.");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUserWithProfile();
    if (!user || user.role !== "CLIENT" || !user.clientProfile) return notFound();

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
      select: {
        id: true,
        userId: true,
        phone: true,
        region: true,
        simpleLanguageMode: true,
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
    return handleApiError(error, "CLIENT_PROFILE_UPDATE_ROUTE", "Unable to update profile.");
  }
}
