-- AlterTable
ALTER TABLE "ExportBundle" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "AgentActionReview" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "caseId" TEXT,
    "documentId" TEXT,
    "assistantThreadId" TEXT,
    "assistantMessageId" TEXT,
    "tool" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "arguments" JSONB NOT NULL,
    "resultMessage" TEXT,
    "resultAction" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentActionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationBooking" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "clientProfileId" TEXT NOT NULL,
    "lawyerProfileId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "requestedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "scheduledAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "feeAmount" DOUBLE PRECISION,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentReference" TEXT,
    "meetingMode" TEXT NOT NULL DEFAULT 'ONLINE',
    "meetingLink" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentActionReview_createdById_status_idx" ON "AgentActionReview"("createdById", "status");

-- CreateIndex
CREATE INDEX "AgentActionReview_caseId_status_idx" ON "AgentActionReview"("caseId", "status");

-- CreateIndex
CREATE INDEX "AgentActionReview_assistantThreadId_idx" ON "AgentActionReview"("assistantThreadId");

-- CreateIndex
CREATE INDEX "ConsultationBooking_caseId_status_idx" ON "ConsultationBooking"("caseId", "status");

-- CreateIndex
CREATE INDEX "ConsultationBooking_clientProfileId_status_idx" ON "ConsultationBooking"("clientProfileId", "status");

-- CreateIndex
CREATE INDEX "ConsultationBooking_lawyerProfileId_status_idx" ON "ConsultationBooking"("lawyerProfileId", "status");

-- AddForeignKey
ALTER TABLE "AgentActionReview" ADD CONSTRAINT "AgentActionReview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentActionReview" ADD CONSTRAINT "AgentActionReview_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentActionReview" ADD CONSTRAINT "AgentActionReview_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentActionReview" ADD CONSTRAINT "AgentActionReview_assistantThreadId_fkey" FOREIGN KEY ("assistantThreadId") REFERENCES "AssistantThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentActionReview" ADD CONSTRAINT "AgentActionReview_assistantMessageId_fkey" FOREIGN KEY ("assistantMessageId") REFERENCES "AssistantMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationBooking" ADD CONSTRAINT "ConsultationBooking_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationBooking" ADD CONSTRAINT "ConsultationBooking_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationBooking" ADD CONSTRAINT "ConsultationBooking_lawyerProfileId_fkey" FOREIGN KEY ("lawyerProfileId") REFERENCES "LawyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationBooking" ADD CONSTRAINT "ConsultationBooking_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "CaseAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationBooking" ADD CONSTRAINT "ConsultationBooking_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
