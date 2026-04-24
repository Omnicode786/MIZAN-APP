import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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
}
