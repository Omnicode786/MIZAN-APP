-- Performance indexes for high-frequency workspace, dashboard, search, AI, and export access paths.
-- These are intentionally narrow composite indexes for scoped WHERE + ORDER BY patterns.

CREATE INDEX IF NOT EXISTS "LawyerProfile_isPublic_verifiedBadge_rating_idx" ON "LawyerProfile"("isPublic", "verifiedBadge", "rating");
CREATE INDEX IF NOT EXISTS "LawyerProfile_city_idx" ON "LawyerProfile"("city");
CREATE INDEX IF NOT EXISTS "LawyerProfile_specialties_gin_idx" ON "LawyerProfile" USING GIN ("specialties");

CREATE INDEX IF NOT EXISTS "Case_clientProfileId_updatedAt_idx" ON "Case"("clientProfileId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Case_creatorId_createdAt_idx" ON "Case"("creatorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Case_status_updatedAt_idx" ON "Case"("status", "updatedAt");

CREATE INDEX IF NOT EXISTS "CaseAssignment_lawyerProfileId_status_updatedAt_idx" ON "CaseAssignment"("lawyerProfileId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "CaseAssignment_caseId_status_idx" ON "CaseAssignment"("caseId", "status");

CREATE INDEX IF NOT EXISTS "Document_caseId_createdAt_idx" ON "Document"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "Document_uploadedById_createdAt_idx" ON "Document"("uploadedById", "createdAt");
CREATE INDEX IF NOT EXISTS "Document_fileType_createdAt_idx" ON "Document"("fileType", "createdAt");

CREATE INDEX IF NOT EXISTS "EvidenceItem_caseId_createdAt_idx" ON "EvidenceItem"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "EvidenceItem_documentId_idx" ON "EvidenceItem"("documentId");

CREATE INDEX IF NOT EXISTS "TimelineEvent_caseId_eventDate_idx" ON "TimelineEvent"("caseId", "eventDate");
CREATE INDEX IF NOT EXISTS "TimelineEvent_caseId_createdAt_idx" ON "TimelineEvent"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "TimelineEvent_sourceDocumentId_idx" ON "TimelineEvent"("sourceDocumentId");

CREATE INDEX IF NOT EXISTS "Deadline_caseId_dueDate_idx" ON "Deadline"("caseId", "dueDate");
CREATE INDEX IF NOT EXISTS "Deadline_caseId_status_dueDate_idx" ON "Deadline"("caseId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "Deadline_sourceDocumentId_idx" ON "Deadline"("sourceDocumentId");

CREATE INDEX IF NOT EXISTS "Draft_caseId_updatedAt_idx" ON "Draft"("caseId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Draft_createdById_createdAt_idx" ON "Draft"("createdById", "createdAt");
CREATE INDEX IF NOT EXISTS "DraftVersion_draftId_createdAt_idx" ON "DraftVersion"("draftId", "createdAt");
CREATE INDEX IF NOT EXISTS "DraftVersion_createdById_createdAt_idx" ON "DraftVersion"("createdById", "createdAt");

CREATE INDEX IF NOT EXISTS "Comment_caseId_createdAt_idx" ON "Comment"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_authorId_createdAt_idx" ON "Comment"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_documentId_idx" ON "Comment"("documentId");

CREATE INDEX IF NOT EXISTS "InternalNote_caseId_createdAt_idx" ON "InternalNote"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "InternalNote_authorId_createdAt_idx" ON "InternalNote"("authorId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

CREATE INDEX IF NOT EXISTS "ExportBundle_caseId_createdAt_idx" ON "ExportBundle"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "ExportBundle_createdById_createdAt_idx" ON "ExportBundle"("createdById", "createdAt");

CREATE INDEX IF NOT EXISTS "RedactionJob_caseId_createdAt_idx" ON "RedactionJob"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "RedactionJob_documentId_idx" ON "RedactionJob"("documentId");
CREATE INDEX IF NOT EXISTS "RedactionJob_createdById_createdAt_idx" ON "RedactionJob"("createdById", "createdAt");
CREATE INDEX IF NOT EXISTS "RedactionJob_status_updatedAt_idx" ON "RedactionJob"("status", "updatedAt");

CREATE INDEX IF NOT EXISTS "ActivityLog_caseId_createdAt_idx" ON "ActivityLog"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_actorId_createdAt_idx" ON "ActivityLog"("actorId", "createdAt");

CREATE INDEX IF NOT EXISTS "AssistantThread_createdById_updatedAt_idx" ON "AssistantThread"("createdById", "updatedAt");
CREATE INDEX IF NOT EXISTS "AssistantThread_caseId_updatedAt_idx" ON "AssistantThread"("caseId", "updatedAt");
CREATE INDEX IF NOT EXISTS "AssistantThread_documentId_updatedAt_idx" ON "AssistantThread"("documentId", "updatedAt");
CREATE INDEX IF NOT EXISTS "AssistantMessage_threadId_createdAt_idx" ON "AssistantMessage"("threadId", "createdAt");

CREATE INDEX IF NOT EXISTS "DebateSession_caseId_createdAt_idx" ON "DebateSession"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "DebateSession_lawyerId_createdAt_idx" ON "DebateSession"("lawyerId", "createdAt");
CREATE INDEX IF NOT EXISTS "DebateSession_status_endsAt_idx" ON "DebateSession"("status", "endsAt");
CREATE INDEX IF NOT EXISTS "DebateTurn_sessionId_roundNumber_createdAt_idx" ON "DebateTurn"("sessionId", "roundNumber", "createdAt");
