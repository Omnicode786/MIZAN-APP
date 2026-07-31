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

const SEARCH_STOP_WORDS = new Set([
  "about",
  "advocate",
  "attorney",
  "best",
  "case",
  "client",
  "could",
  "find",
  "from",
  "handle",
  "help",
  "hire",
  "lawyer",
  "legal",
  "matter",
  "need",
  "please",
  "recommend",
  "should",
  "suitable",
  "that",
  "this",
  "want",
  "which",
  "with"
]);

function tokens(value?: string | null) {
  return normalize(value)
    .replace(/[_/-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !SEARCH_STOP_WORDS.has(token));
}

function inferCity(text: string) {
  const lower = normalize(text);
  const cities = [
    "karachi",
    "lahore",
    "islamabad",
    "rawalpindi",
    "peshawar",
    "quetta",
    "multan",
    "faisalabad",
    "hyderabad"
  ];
  const city = cities.find((item) => lower.includes(item));
  return city ? city[0].toUpperCase() + city.slice(1) : undefined;
}

function inferJurisdictionFromCity(city?: string | null) {
  const normalized = normalize(city);
  if (["karachi", "hyderabad"].includes(normalized)) return "Sindh";
  if (["lahore", "rawalpindi", "faisalabad", "multan"].includes(normalized)) return "Punjab";
  if (normalized === "islamabad") return "Islamabad Capital Territory";
  if (normalized === "peshawar") return "Khyber Pakhtunkhwa";
  if (normalized === "quetta") return "Balochistan";
  return undefined;
}

function inferLanguage(text: string) {
  const lower = normalize(text);
  if (lower.includes("roman urdu")) return "Roman Urdu";
  if (lower.includes("urdu")) return "Urdu";
  if (lower.includes("english")) return "English";
  if (lower.includes("punjabi")) return "Punjabi";
  if (lower.includes("sindhi")) return "Sindhi";
  return undefined;
}

function inferPracticeArea(text: string) {
  const lower = normalize(text);
  const practiceSignals = [
    {
      practiceArea: "Tenancy disputes",
      caseCategory: "RENTAL_TENANCY",
      signals: ["tenant", "tenancy", "rent", "arrears", "eviction", "landlord", "lease", "security deposit"]
    },
    {
      practiceArea: "Employment",
      caseCategory: "EMPLOYMENT",
      signals: ["employment", "salary", "termination", "workplace", "job", "employee", "employer", "wages"]
    },
    {
      practiceArea: "Harassment",
      caseCategory: "HARASSMENT",
      signals: ["harassment", "threat", "stalking", "blackmail", "abuse"]
    },
    {
      practiceArea: "Cyber complaints",
      caseCategory: "CYBER_COMPLAINT",
      signals: ["cyber", "online", "facebook", "instagram", "whatsapp", "scam", "digital", "account hacked"]
    },
    {
      practiceArea: "Contract review",
      caseCategory: "CONTRACT_REVIEW",
      signals: ["contract", "agreement", "clause", "breach", "terms"]
    },
    {
      practiceArea: "Payment disputes",
      caseCategory: "PAYMENT_DISPUTE",
      signals: ["payment", "refund", "invoice", "cheque", "vendor", "delivery", "money"]
    },
    {
      practiceArea: "Family law",
      caseCategory: "OTHER",
      signals: ["family", "divorce", "khula", "custody", "maintenance", "nikah", "inheritance"]
    },
    {
      practiceArea: "Property law",
      caseCategory: "OTHER",
      signals: ["property", "plot", "house", "possession", "registry", "mutation", "illegal occupation"]
    }
  ];

  return practiceSignals.find((item) => item.signals.some((signal) => lower.includes(signal)));
}

function enrichInput(input: LawyerSearchInput): LawyerSearchInput {
  const combined = [
    input.caseSummary,
    input.practiceArea,
    input.caseCategory,
    input.jurisdiction,
    input.city,
    input.preferredLanguage,
    input.consultationType
  ]
    .filter(Boolean)
    .join(" ");
  const inferredPractice = inferPracticeArea(combined);
  const city = input.city || inferCity(combined);

  return {
    ...input,
    city,
    jurisdiction: input.jurisdiction || inferJurisdictionFromCity(city),
    preferredLanguage: input.preferredLanguage || inferLanguage(combined),
    practiceArea: input.practiceArea || inferredPractice?.practiceArea,
    caseCategory: input.caseCategory || inferredPractice?.caseCategory,
    consultationType:
      input.consultationType ||
      (/\bonline|video|remote|zoom\b/i.test(combined)
        ? "ONLINE"
        : /\bin.?person|office|physical\b/i.test(combined)
          ? "IN_PERSON"
          : undefined)
  };
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
  const profileNarrativeText = [
    lawyer.user.name,
    lawyer.firmName,
    lawyer.bio,
    ...lawyer.specialties
  ].filter(Boolean) as string[];

  if (lawyer.verifiedBadge) {
    score += 20;
    reasons.push("MIZAN verified profile");
  }

  const specialtyMatches =
    textMatches(lawyer.specialties, input.practiceArea) +
    textMatches(lawyer.specialties, input.caseCategory);
  if (specialtyMatches) {
    score += Math.min(42, 24 + specialtyMatches * 10);
    reasons.push("Practice focus matches the case type");
  }

  const narrativeMatches = textMatches(profileNarrativeText, input.caseSummary);
  if (narrativeMatches) {
    score += Math.min(10, narrativeMatches * 2);
    reasons.push("Profile text overlaps with the case description");
  }

  if (includesLoose(lawyer.jurisdictions, input.jurisdiction)) {
    score += 14;
    reasons.push("Practices in the requested jurisdiction");
  }

  if (normalize(lawyer.city) && normalize(lawyer.city) === normalize(input.city)) {
    score += 12;
    reasons.push("Located in the requested city");
  } else if (input.city && includesLoose(lawyer.jurisdictions, inferJurisdictionFromCity(input.city))) {
    score += 5;
    reasons.push("Practices in the province connected to the requested city");
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
    matchReasons: reasons.length ? reasons.slice(0, 5) : ["Public searchable lawyer profile"]
  };
}

export async function searchLawyersForCase(input: LawyerSearchInput) {
  const effectiveInput = enrichInput(input);
  const q = [
    effectiveInput.practiceArea,
    effectiveInput.caseCategory,
    effectiveInput.caseSummary,
    effectiveInput.city,
    effectiveInput.jurisdiction
  ]
    .filter(Boolean)
    .join(" ");

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

  const baseWhere = {
    isPublic: true,
    searchable: true,
    availability: { not: "UNAVAILABLE" }
  } satisfies Prisma.LawyerProfileWhereInput;

  async function loadCandidates(includeUnverified: boolean) {
    return prisma.lawyerProfile.findMany({
      where: {
        ...baseWhere,
        verifiedBadge: includeUnverified ? undefined : true
      },
      select,
      orderBy: [{ rating: "desc" }, { yearsExperience: "desc" }],
      take: 120
    });
  }

  const shouldAllowUnverifiedFallback = Boolean(input.includeUnverified);
  let lawyers: LawyerSearchRow[] = await loadCandidates(shouldAllowUnverifiedFallback);

  let matches = lawyers
    .map((lawyer) => scoreLawyer(lawyer, effectiveInput))
    .filter((lawyer) => lawyer.matchScore > 0 || !q)
    .sort((a, b) => b.matchScore - a.matchScore || b.yearsOfExperience - a.yearsOfExperience)
    .slice(0, Math.min(Math.max(input.limit || 5, 1), 12));

  if (!matches.length && !shouldAllowUnverifiedFallback) {
    lawyers = await loadCandidates(true);
    matches = lawyers
      .map((lawyer) => scoreLawyer(lawyer, { ...effectiveInput, includeUnverified: true }))
      .sort((a, b) => b.matchScore - a.matchScore || b.yearsOfExperience - a.yearsOfExperience)
      .slice(0, Math.min(Math.max(input.limit || 5, 1), 12));
  }

  return { matches };
}
