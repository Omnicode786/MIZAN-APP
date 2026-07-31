DO $$ DECLARE
  has_case_origin_column BOOLEAN;
  has_origin_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Case'
      AND column_name = 'caseOrigin'
  ) INTO has_case_origin_column;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Case'
      AND column_name = 'origin'
  ) INTO has_origin_column;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaseOrigin') THEN
    CREATE TYPE "CaseOrigin" AS ENUM ('CLIENT_SUBMITTED', 'LAWYER_CREATED', 'ADMIN_CREATED');
  ELSIF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'CaseOrigin'
        AND e.enumlabel = 'CLIENT_SUBMITTED'
    )
  THEN
    IF has_case_origin_column AND NOT has_origin_column THEN
      DROP TYPE IF EXISTS "CaseOrigin_new";
      CREATE TYPE "CaseOrigin_new" AS ENUM ('CLIENT_SUBMITTED', 'LAWYER_CREATED', 'ADMIN_CREATED');

      ALTER TABLE "Case"
        ADD COLUMN "origin" "CaseOrigin_new" NOT NULL DEFAULT 'CLIENT_SUBMITTED';

      UPDATE "Case"
      SET "origin" = CASE
        WHEN "caseOrigin"::TEXT = 'LAWYER_PERSONAL' THEN 'LAWYER_CREATED'::"CaseOrigin_new"
        ELSE 'CLIENT_SUBMITTED'::"CaseOrigin_new"
      END;

      ALTER TABLE "Case" DROP COLUMN "caseOrigin";
      DROP TYPE "CaseOrigin";
      ALTER TYPE "CaseOrigin_new" RENAME TO "CaseOrigin";
    ELSIF EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_type t ON t.oid = a.atttypid
      WHERE t.typname = 'CaseOrigin'
        AND a.attnum > 0
        AND NOT a.attisdropped
    )
    THEN
      RAISE EXCEPTION 'Existing CaseOrigin enum is used by a column and cannot be replaced automatically';
    ELSE
      DROP TYPE "CaseOrigin";
      CREATE TYPE "CaseOrigin" AS ENUM ('CLIENT_SUBMITTED', 'LAWYER_CREATED', 'ADMIN_CREATED');
    END IF;
  END IF;
END $$;

ALTER TABLE "LawyerProfile"
  ADD COLUMN IF NOT EXISTS "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "jurisdictions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "consultationTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "availability" TEXT NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS "searchable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "barRegistration" TEXT;

ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "origin" "CaseOrigin" NOT NULL DEFAULT 'CLIENT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS "parties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "jurisdiction" TEXT,
  ADD COLUMN IF NOT EXISTS "lawyerOwnerProfileId" TEXT;

ALTER TABLE "Case" DROP CONSTRAINT IF EXISTS "Case_clientProfileId_fkey";
ALTER TABLE "Case" ALTER COLUMN "clientProfileId" DROP NOT NULL;

ALTER TABLE "Case"
  ADD CONSTRAINT "Case_clientProfileId_fkey"
  FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Case" DROP CONSTRAINT IF EXISTS "Case_lawyerOwnerProfileId_fkey";
ALTER TABLE "Case"
  ADD CONSTRAINT "Case_lawyerOwnerProfileId_fkey"
  FOREIGN KEY ("lawyerOwnerProfileId") REFERENCES "LawyerProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssistantThread"
  ADD COLUMN IF NOT EXISTS "ownerRole" "Role" NOT NULL DEFAULT 'CLIENT';

UPDATE "AssistantThread" AS thread
SET "ownerRole" = "User"."role"
FROM "User"
WHERE thread."createdById" = "User"."id";

CREATE INDEX IF NOT EXISTS "LawyerProfile_isPublic_searchable_verifiedBadge_rating_idx"
  ON "LawyerProfile"("isPublic", "searchable", "verifiedBadge", "rating");

CREATE INDEX IF NOT EXISTS "LawyerProfile_availability_idx"
  ON "LawyerProfile"("availability");

CREATE INDEX IF NOT EXISTS "Case_lawyerOwnerProfileId_updatedAt_idx"
  ON "Case"("lawyerOwnerProfileId", "updatedAt");

CREATE INDEX IF NOT EXISTS "Case_origin_updatedAt_idx"
  ON "Case"("origin", "updatedAt");

CREATE INDEX IF NOT EXISTS "Case_jurisdiction_idx"
  ON "Case"("jurisdiction");

CREATE INDEX IF NOT EXISTS "AssistantThread_createdById_ownerRole_updatedAt_idx"
  ON "AssistantThread"("createdById", "ownerRole", "updatedAt");

CREATE INDEX IF NOT EXISTS "AssistantThread_caseId_createdById_ownerRole_updatedAt_idx"
  ON "AssistantThread"("caseId", "createdById", "ownerRole", "updatedAt");
