import { PublicLawyersDirectory } from "@/components/workspace/public-lawyers-directory";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LawyersPage() {
  const [user, lawyers] = await Promise.all([
    getCurrentUserWithProfile().catch(() => null),
    prisma.lawyerProfile.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        firmName: true,
        bio: true,
        specialties: true,
        yearsExperience: true,
        hourlyRate: true,
        fixedFeeFrom: true,
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
    })
  ]);

  return (
    <PublicLawyersDirectory
      user={user ? { name: user.name, role: user.role } : null}
      lawyers={lawyers.map((lawyer) => ({
        id: lawyer.id,
        name: lawyer.user.name,
        firmName: lawyer.firmName,
        bio: lawyer.bio,
        specialties: lawyer.specialties,
        yearsExperience: lawyer.yearsExperience,
        hourlyRate: lawyer.hourlyRate,
        fixedFeeFrom: lawyer.fixedFeeFrom,
        verifiedBadge: lawyer.verifiedBadge,
        rating: lawyer.rating,
        city: lawyer.city
      }))}
    />
  );
}
