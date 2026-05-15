ALTER TABLE "AssistantMessage"
ADD COLUMN "sequence" INTEGER;

WITH ranked_messages AS (
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
)
UPDATE "AssistantMessage" AS message
SET "sequence" = ranked_messages."nextSequence"
FROM ranked_messages
WHERE message."id" = ranked_messages."id";

ALTER TABLE "AssistantMessage"
ALTER COLUMN "sequence" SET NOT NULL,
ALTER COLUMN "sequence" SET DEFAULT 0;

CREATE UNIQUE INDEX "AssistantMessage_threadId_sequence_key"
ON "AssistantMessage"("threadId", "sequence");

CREATE INDEX "AssistantMessage_threadId_sequence_idx"
ON "AssistantMessage"("threadId", "sequence");
