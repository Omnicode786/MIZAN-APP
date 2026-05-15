-- Separate lawyer request acceptance from client proposal acceptance.
CREATE TYPE "ProposalStatus" AS ENUM ('NOT_SENT', 'SENT', 'ACCEPTED', 'DECLINED');

ALTER TABLE "CaseAssignment"
ADD COLUMN "proposalStatus" "ProposalStatus" NOT NULL DEFAULT 'NOT_SENT',
ADD COLUMN "proposalSentAt" TIMESTAMP(3),
ADD COLUMN "proposalDecidedAt" TIMESTAMP(3);

CREATE INDEX "CaseAssignment_lawyerProfileId_status_proposalStatus_updatedAt_idx"
ON "CaseAssignment"("lawyerProfileId", "status", "proposalStatus", "updatedAt");

CREATE INDEX "CaseAssignment_caseId_status_proposalStatus_idx"
ON "CaseAssignment"("caseId", "status", "proposalStatus");
