import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type LawyerSearchInput = {
  caseSummary?: string;
  practiceArea?: string;
  caseCategory?: string;
  jurisdiction?: string;
  city?: string;
  preferredLanguage?: string;
  budget?: {
    minimum?: number;
    maximum?: number;
  };
  consultationType?: string;
  limit?: number;
  includeUnverified?: boolean;
};

export type LawyerSearchMatch = {
  lawyerId: string;
  name: string;
  firmName: string | null;
  practiceAreas: string[];
  yearsOfExperience: number;
  city: string | null;
  languages: string[];
  jurisdictions: string[];
  consultationTypes: string[];
  verificationStatus: "VERIFIED" | "UNVERIFIED";
  availability: string;
  feeFrom: number | null;
  rating: number | null;
  matchScore: number;
  matchReasons: string[];
};

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function tokens(value?: string | null) {
  return normalize(value)
    .replace(/[_/-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function includesLoose(values: string[], target?: string | null) {
  const needle = normalize(target);
  if (!needle) return false;
  return values.some((value) => {
    const haystack = normalize(value);
    return haystack === needle || haystack.includes(needle) || needle.includes(haystack);
  });
}

function textMatches(values: string[], query?: string | null) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return 0;
  const haystack = values.map(normalize).join(" ");
  return queryTokens.filter((token) => haystack.includes(token)).length;
}

function scoreLawyer(
  lawyer: {
    id: string;
    firmName: string | null;
    bio: string | null;
    specialties: string[];
    languages: string[];
    jurisdictions: string[];
    consultationTypes: string[];
    yearsExperience: number;
    fixedFeeFrom: number | null;
    hourlyRate: number | null;
    verifiedBadge: boolean;
    rating: number | null;
    city: string | null;
    availability: string;
    user: { name: string };
  },
  input: LawyerSearchInput
): LawyerSearchMatch {
  let score = 0;
  const reasons: string[] = [];
  const searchableText = [
    lawyer.user.name,
    lawyer.firmName,
    lawyer.bio,
    lawyer.city,
    ...lawyer.specialties,
    ...lawyer.jurisdictions
  ].filter(Boolean) as string[];

  if (lawyer.verifiedBadge) {
    score += 20;
    reasons.push("MIZAN verified profile");
  }

  const specialtyMatches =
    textMatches(lawyer.specialties, input.practiceArea) +
    textMatches(lawyer.specialties, input.caseCategory) +
    textMatches(searchableText, input.caseSummary);
  if (specialtyMatches) {
    score += Math.min(28, 8 + specialtyMatches * 7);
    reasons.push("Practice focus matches the case type");
  }

  if (includesLoose(lawyer.jurisdictions, input.jurisdiction)) {
    score += 14;
    reasons.push("Practices in the requested jurisdiction");
  }

  if (normalize(lawyer.city) && normalize(lawyer.city) === normalize(input.city)) {
    score += 12;
    reasons.push("Located in the requested city");
  }

  if (includesLoose(lawyer.languages, input.preferredLanguage)) {
    score += 9;
    reasons.push("Matches the preferred language");
  }

  if (includesLoose(lawyer.consultationTypes, input.consultationType)) {
    score += 7;
    reasons.push("Offers the requested consultation type");
  }

  const fee = lawyer.fixedFeeFrom ?? lawyer.hourlyRate;
  if (typeof fee === "number" && typeof input.budget?.maximum === "number" && fee <= input.budget.maximum) {
    score += 8;
    reasons.push("Fits the stated budget range");
  }

  if (lawyer.yearsExperience >= 10) {
    score += 10;
    reasons.push("Has 10+ years of experience");
  } else if (lawyer.yearsExperience >= 5) {
    score += 7;
    reasons.push("Has 5+ years of experience");
  } else {
    score += Math.min(5, lawyer.yearsExperience);
  }

  if (typeof lawyer.rating === "number") {
    score += Math.min(10, Math.round(lawyer.rating * 2));
    if (lawyer.rating >= 4) reasons.push("Strong platform rating");
  }

  return {
    lawyerId: lawyer.id,
    name: lawyer.user.name,
    firmName: lawyer.firmName,
    practiceAreas: lawyer.specialties,
    yearsOfExperience: lawyer.yearsExperience,
    city: lawyer.city,
    languages: lawyer.languages,
    jurisdictions: lawyer.jurisdictions,
    consultationTypes: lawyer.consultationTypes,
    verificationStatus: lawyer.verifiedBadge ? "VERIFIED" : "UNVERIFIED",
    availability: lawyer.availability,
    feeFrom: fee ?? null,
    rating: lawyer.rating,
    matchScore: Math.max(0, Math.min(100, score)),
    matchReasons: reasons.slice(0, 5)
  };
}

export async function searchLawyersForCase(input: LawyerSearchInput) {
  const q = [input.practiceArea, input.caseCategory, input.caseSummary, input.city, input.jurisdiction]
    .filter(Boolean)
    .join(" ");
  const specialtyTokens = tokens(input.practiceArea || input.caseCategory || q);
  const jurisdictionTokens = tokens(input.jurisdiction);
  const languageTokens = tokens(input.preferredLanguage);

  const select = {
    id: true,
    firmName: true,
    bio: true,
    specialties: true,
    languages: true,
    jurisdictions: true,
    consultationTypes: true,
    yearsExperience: true,
    hourlyRate: true,
    fixedFeeFrom: true,
    verifiedBadge: true,
    rating: true,
    city: true,
    availability: true,
    user: {
      select: {
        name: true
      }
    }
  } as const;
  type LawyerSearchRow = Prisma.LawyerProfileGetPayload<{ select: typeof select }>;

  const where = {
    isPublic: true,
    searchable: true,
    availability: { not: "UNAVAILABLE" },
    verifiedBadge: input.includeUnverified ? undefined : true
  } satisfies Prisma.LawyerProfileWhereInput;
  const searchOr: Prisma.LawyerProfileWhereInput[] = [];
  if (q) {
    searchOr.push(
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
      { firmName: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } }
    );
    if (input.city) searchOr.push({ city: { contains: input.city, mode: "insensitive" } });
    if (specialtyTokens.length) searchOr.push({ specialties: { hasSome: specialtyTokens } });
    if (jurisdictionTokens.length) searchOr.push({ jurisdictions: { hasSome: jurisdictionTokens } });
    if (languageTokens.length) searchOr.push({ languages: { hasSome: languageTokens } });
  }

  let lawyers: LawyerSearchRow[] = await prisma.lawyerProfile.findMany({
    where: {
      ...where,
      OR: searchOr.length ? searchOr : undefined
    },
    select,
    take: 80
  });

  if (!lawyers.length && q) {
    lawyers = await prisma.lawyerProfile.findMany({
      where,
      select,
      orderBy: [{ rating: "desc" }, { yearsExperience: "desc" }],
      take: 80
    });
  }

  const matches = lawyers
    .map((lawyer) => scoreLawyer(lawyer, input))
    .filter((lawyer) => lawyer.matchScore > 0 || !q)
    .sort((a, b) => b.matchScore - a.matchScore || b.yearsOfExperience - a.yearsOfExperience)
    .slice(0, Math.min(Math.max(input.limit || 5, 1), 12));

  return { matches };
}
