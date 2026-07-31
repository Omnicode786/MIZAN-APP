import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_LANGUAGES = ["Urdu", "English"];
const DEFAULT_CONSULTATION_TYPES = ["ONLINE", "IN_PERSON"];

function inferJurisdictions(city?: string | null) {
  const normalized = (city || "").toLowerCase();
  if (normalized.includes("karachi") || normalized.includes("hyderabad")) return ["Sindh", "Pakistan"];
  if (normalized.includes("lahore") || normalized.includes("rawalpindi") || normalized.includes("faisalabad")) {
    return ["Punjab", "Pakistan"];
  }
  if (normalized.includes("islamabad")) return ["Islamabad Capital Territory", "Pakistan"];
  if (normalized.includes("peshawar")) return ["Khyber Pakhtunkhwa", "Pakistan"];
  if (normalized.includes("quetta")) return ["Balochistan", "Pakistan"];
  return ["Pakistan"];
}

async function backfillLawyerSearchMetadata() {
  const lawyers = await prisma.lawyerProfile.findMany({
    select: {
      id: true,
      city: true,
      languages: true,
      jurisdictions: true,
      consultationTypes: true,
      availability: true
    }
  });

  let updated = 0;
  for (const lawyer of lawyers) {
    const data: {
      languages?: string[];
      jurisdictions?: string[];
      consultationTypes?: string[];
      availability?: string;
    } = {};

    if (!lawyer.languages.length) data.languages = DEFAULT_LANGUAGES;
    if (!lawyer.jurisdictions.length) data.jurisdictions = inferJurisdictions(lawyer.city);
    if (!lawyer.consultationTypes.length) data.consultationTypes = DEFAULT_CONSULTATION_TYPES;
    if (!lawyer.availability.trim()) data.availability = "AVAILABLE";

    if (Object.keys(data).length) {
      await prisma.lawyerProfile.update({
        where: { id: lawyer.id },
        data
      });
      updated += 1;
    }
  }

  return updated;
}

async function backfillAssistantThreadOwnerRoles() {
  const result = await prisma.$executeRaw`
    UPDATE "AssistantThread" AS thread
    SET "ownerRole" = "User"."role"
    FROM "User"
    WHERE thread."createdById" = "User"."id"
      AND thread."ownerRole" <> "User"."role"
  `;

  return Number(result);
}

async function backfillAssistantMessageSequences() {
  const result = await prisma.$executeRaw`
    WITH duplicate_zero_threads AS (
      SELECT "threadId"
      FROM "AssistantMessage"
      GROUP BY "threadId"
      HAVING COUNT(*) FILTER (WHERE "sequence" = 0) > 1
    ),
    ranked_messages AS (
      SELECT
        "id",
        ROW_NUMBER() OVER (
          PARTITION BY "threadId"
          ORDER BY
            "createdAt" ASC,
            CASE
              WHEN "role" = 'USER' THEN 0
              WHEN "role" = 'AI' THEN 1
              ELSE 2
            END ASC,
            "id" ASC
        ) - 1 AS "nextSequence"
      FROM "AssistantMessage"
      WHERE "threadId" IN (SELECT "threadId" FROM duplicate_zero_threads)
    )
    UPDATE "AssistantMessage" AS message
    SET "sequence" = ranked_messages."nextSequence"
    FROM ranked_messages
    WHERE message."id" = ranked_messages."id"
      AND message."sequence" <> ranked_messages."nextSequence"
  `;

  return Number(result);
}

async function backfillCaseOrigins() {
  const result = await prisma.case.updateMany({
    where: {
      origin: "CLIENT_SUBMITTED",
      clientProfileId: null,
      lawyerOwnerProfileId: { not: null }
    },
    data: {
      origin: "LAWYER_CREATED"
    }
  });

  return result.count;
}

async function main() {
  const [lawyersUpdated, threadRolesUpdated, messageSequencesUpdated, caseOriginsUpdated] = await Promise.all([
    backfillLawyerSearchMetadata(),
    backfillAssistantThreadOwnerRoles(),
    backfillAssistantMessageSequences(),
    backfillCaseOrigins()
  ]);

  console.log(
    JSON.stringify(
      {
        lawyersUpdated,
        threadRolesUpdated,
        messageSequencesUpdated,
        caseOriginsUpdated
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
