import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { withApiObservability } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiObservability(request, { route: "/api/lawyers/public", feature: "lawyer.discovery" }, async () => {
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
        select: {
          id: true,
          firmName: true,
          bio: true,
          specialties: true,
          yearsExperience: true,
          hourlyRate: true,
          fixedFeeFrom: true,
          isPublic: true,
          verifiedBadge: true,
          rating: true,
          city: true,
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [{ verifiedBadge: "desc" }, { rating: "desc" }],
        take: 60
      });

      return NextResponse.json({ lawyers });
    } catch (error) {
      return handleApiError(error, "PUBLIC_LAWYERS_ROUTE", "Unable to load lawyers.");
    }
  });
}
