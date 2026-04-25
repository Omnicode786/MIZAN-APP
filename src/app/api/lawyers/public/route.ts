import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const lawyers = await prisma.lawyerProfile.findMany({
      where: {
        isPublic: true,
        OR: q
          ? [
              { user: { name: { contains: q, mode: "insensitive" } } },
              { firmName: { contains: q, mode: "insensitive" } },
              { specialties: { has: q } },
              { bio: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } }
            ]
          : undefined
      },
      include: { user: true },
      orderBy: [{ verifiedBadge: "desc" }, { rating: "desc" }]
    });

    return NextResponse.json({ lawyers });
  } catch (error) {
    return handleApiError(error, "PUBLIC_LAWYERS_ROUTE", "Unable to load lawyers.");
  }
}
