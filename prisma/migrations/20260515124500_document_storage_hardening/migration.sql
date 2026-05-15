CREATE TYPE "DocumentScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED', 'SKIPPED');
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'TEXT_UNREADABLE');

ALTER TABLE "Document"
ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN "storageBucket" TEXT,
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "storageUrl" TEXT,
ADD COLUMN "fileHash" TEXT,
ADD COLUMN "scanStatus" "DocumentScanStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "scanCheckedAt" TIMESTAMP(3),
ADD COLUMN "processingStatus" "DocumentProcessingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "processedAt" TIMESTAMP(3);

UPDATE "Document"
SET
  "storageProvider" = COALESCE("metadata" #>> '{storage,storageProvider}', 'local'),
  "storageBucket" = COALESCE("metadata" #>> '{storage,bucket}', "metadata" #>> '{storage,folder}'),
  "storageKey" = COALESCE("metadata" #>> '{storage,publicId}', "metadata" #>> '{storage,publicPath}', "filePath"),
  "storageUrl" = COALESCE("metadata" #>> '{storage,secureUrl}', "metadata" #>> '{storage,publicPath}', "filePath"),
  "scanStatus" = 'SKIPPED',
  "scanCheckedAt" = COALESCE("updatedAt", "createdAt"),
  "processingStatus" = CASE
    WHEN "metadata" ->> 'analysisStatus' = 'completed' THEN 'COMPLETED'::"DocumentProcessingStatus"
    WHEN "metadata" ->> 'analysisStatus' = 'text_unreadable' THEN 'TEXT_UNREADABLE'::"DocumentProcessingStatus"
    ELSE 'PENDING'::"DocumentProcessingStatus"
  END,
  "processedAt" = CASE
    WHEN "metadata" ->> 'analysisStatus' IN ('completed', 'text_unreadable') THEN COALESCE("updatedAt", "createdAt")
    ELSE NULL
  END;

CREATE INDEX "Document_storageProvider_storageKey_idx" ON "Document"("storageProvider", "storageKey");
CREATE INDEX "Document_fileHash_idx" ON "Document"("fileHash");
CREATE INDEX "Document_scanStatus_createdAt_idx" ON "Document"("scanStatus", "createdAt");
CREATE INDEX "Document_processingStatus_createdAt_idx" ON "Document"("processingStatus", "createdAt");
