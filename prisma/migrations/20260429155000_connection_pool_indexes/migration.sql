-- Narrow indexes for case workspace relations that are repeatedly loaded by caseId and ordered by recency/schedule.
-- Keep these scoped to observed access paths so writes do not carry unnecessary index overhead.

CREATE INDEX IF NOT EXISTS "CaseAssignment_caseId_updatedAt_idx"
  ON "CaseAssignment"("caseId", "updatedAt");

CREATE INDEX IF NOT EXISTS "AgentActionReview_caseId_createdAt_idx"
  ON "AgentActionReview"("caseId", "createdAt");

CREATE INDEX IF NOT EXISTS "AgentActionReview_createdById_createdAt_idx"
  ON "AgentActionReview"("createdById", "createdAt");

CREATE INDEX IF NOT EXISTS "ConsultationBooking_caseId_scheduledAt_idx"
  ON "ConsultationBooking"("caseId", "scheduledAt");

CREATE INDEX IF NOT EXISTS "ConsultationBooking_clientProfileId_createdAt_idx"
  ON "ConsultationBooking"("clientProfileId", "createdAt");

CREATE INDEX IF NOT EXISTS "ConsultationBooking_lawyerProfileId_createdAt_idx"
  ON "ConsultationBooking"("lawyerProfileId", "createdAt");

CREATE INDEX IF NOT EXISTS "ConsultationBooking_assignmentId_idx"
  ON "ConsultationBooking"("assignmentId");
