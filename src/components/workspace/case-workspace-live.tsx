"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  Download,
  Eye,
  FileText,
  FolderOpen,
  MessageSquare,
  PackageCheck,
  Scale,
  ShieldCheck,
  Upload
} from "lucide-react";
import { AiTranslationActions } from "@/components/ai-translation-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActivityFeed } from "@/components/workspace/activity-feed";
import { AssistantPanel } from "@/components/workspace/assistant-panel";
import { DebatePanel } from "@/components/workspace/debate-panel";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { TimelineView } from "@/components/workspace/timeline-view";
import { FormattedAiContent } from "@/utils/ai-content";
import { cn, formatDate, relativeDate, toTitleCase } from "@/lib/utils";

function asArray<T = any>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function SafePill({
  children,
  variant = "secondary",
  className
}: {
  children: ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  className?: string;
}) {
  return (
    <Badge
      variant={variant}
      className={cn(
        "inline-flex min-h-7 max-w-full min-w-0 items-center justify-center overflow-hidden rounded-full px-2.5 py-1 text-center text-[11px] leading-4",
        className
      )}
    >
      <span className="block min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]">
        {children}
      </span>
    </Badge>
  );
}

export function CaseWorkspaceLive({
  initialCase,
  role,
  currentUser,
  simpleLanguageMode
}: {
  initialCase: any;
  role: "CLIENT" | "LAWYER";
  currentUser: any;
  simpleLanguageMode?: boolean;
}) {
  const router = useRouter();
  const language = useLanguage();

  const [title, setTitle] = useState(initialCase.title);
  const [description, setDescription] = useState(initialCase.description || "");
  const [stage, setStage] = useState(initialCase.stage || "");
  const [status, setStatus] = useState(initialCase.status || "INTAKE");
  const [priority, setPriority] = useState(initialCase.priority || "MEDIUM");
  const [uploading, setUploading] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>();
  const [comment, setComment] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [draftTitle, setDraftTitle] = useState("Legal notice draft");
  const [draftType, setDraftType] = useState("LEGAL_NOTICE");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const documents = asArray(initialCase.documents);
  const deadlines = asArray(initialCase.deadlines);
  const drafts = asArray(initialCase.drafts);
  const comments = asArray(initialCase.comments);
  const internalNotes = asArray(initialCase.internalNotes);
  const activityLogs = asArray(initialCase.activityLogs);
  const timelineEvents = asArray(initialCase.timelineEvents);
  const assignments = asArray(initialCase.assignments);
  const agentActionReviews = asArray(initialCase.agentActionReviews);
  const exportBundles = asArray(initialCase.exportBundles);
  const consultationBookings = asArray(initialCase.consultationBookings);

  const pendingAssignments = useMemo(
    () => assignments.filter((item: any) => item.status === "PENDING"),
    [assignments]
  );

  async function refresh() {
    router.refresh();
  }

  async function requireOk(response: Response, fallback: string) {
    if (response.ok) return;
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || fallback);
  }

  function showSuccess(text: string) {
    setNotice({ type: "success", text });
  }

  function showError(error: unknown, fallback: string) {
    setNotice({
      type: "error",
      text: error instanceof Error ? error.message : fallback
    });
  }

  async function saveCase() {
    try {
      setBusy("case");
      setNotice(null);
      const res = await fetch(`/api/cases/${initialCase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, stage, status, priority })
      });
      await requireOk(res, "Unable to save case changes.");
      showSuccess("Case changes saved.");
      refresh();
    } catch (error) {
      showError(error, "Unable to save case changes.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteCase() {
    if (!confirm("Delete this case and all its records?")) return;

    try {
      setBusy("delete-case");
      setNotice(null);
      const res = await fetch(`/api/cases/${initialCase.id}`, { method: "DELETE" });
      await requireOk(res, "Unable to delete case.");
      router.push(role === "CLIENT" ? "/client/cases" : "/lawyer/cases");
    } catch (error) {
      showError(error, "Unable to delete case.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadDocument(file: File) {
    const form = new FormData();
    form.append("caseId", initialCase.id);
    form.append("file", file);
    form.append("language", language);

    try {
      setUploading(true);
      setNotice(null);
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      await requireOk(res, "Unable to upload document.");
      showSuccess("Document uploaded and queued for analysis.");
      refresh();
    } catch (error) {
      showError(error, "Unable to upload document.");
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(id: string) {
    try {
      setBusy(`doc-${id}`);
      setNotice(null);
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      await requireOk(res, "Unable to delete document.");
      showSuccess("Document deleted.");
      refresh();
    } catch (error) {
      showError(error, "Unable to delete document.");
    } finally {
      setBusy(null);
    }
  }

  async function addComment(visibility: "SHARED" | "PRIVATE" = "SHARED") {
    const body = visibility === "PRIVATE" ? privateNote : comment;
    if (!body.trim()) return;

    try {
      setBusy("comment");
      setNotice(null);
      const res = await fetch(visibility === "PRIVATE" ? "/api/internal-notes" : "/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: initialCase.id, body })
      });
      await requireOk(res, "Unable to save message.");
      setComment("");
      setPrivateNote("");
      showSuccess(visibility === "PRIVATE" ? "Internal note saved." : "Comment added.");
      refresh();
    } catch (error) {
      showError(error, "Unable to save message.");
    } finally {
      setBusy(null);
    }
  }

  async function removeComment(id: string) {
    try {
      setBusy(`comment-${id}`);
      setNotice(null);
      const res = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      await requireOk(res, "Unable to delete comment.");
      showSuccess("Comment deleted.");
      refresh();
    } catch (error) {
      showError(error, "Unable to delete comment.");
    } finally {
      setBusy(null);
    }
  }

  async function addDeadline() {
    if (!deadlineTitle.trim() || !deadlineDate) return;

    try {
      setBusy("deadline");
      setNotice(null);
      const res = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: initialCase.id,
          title: deadlineTitle,
          dueDate: deadlineDate,
          importance: "HIGH"
        })
      });
      await requireOk(res, "Unable to create deadline.");
      setDeadlineTitle("");
      setDeadlineDate("");
      showSuccess("Deadline added.");
      refresh();
    } catch (error) {
      showError(error, "Unable to create deadline.");
    } finally {
      setBusy(null);
    }
  }

  async function updateDeadline(id: string, statusValue: string) {
    try {
      setBusy(`deadline-${id}`);
      setNotice(null);
      const res = await fetch("/api/deadlines", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: statusValue })
      });
      await requireOk(res, "Unable to update deadline.");
      showSuccess("Deadline updated.");
      refresh();
    } catch (error) {
      showError(error, "Unable to update deadline.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteDeadline(id: string) {
    try {
      setBusy(`deadline-${id}`);
      setNotice(null);
      const res = await fetch("/api/deadlines", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      await requireOk(res, "Unable to delete deadline.");
      showSuccess("Deadline deleted.");
      refresh();
    } catch (error) {
      showError(error, "Unable to delete deadline.");
    } finally {
      setBusy(null);
    }
  }

  async function generateDraft() {
    try {
      setBusy("draft-generate");
      setNotice(null);
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: initialCase.id, title: draftTitle, type: draftType, language })
      });
      await requireOk(res, "Unable to generate draft.");
      showSuccess("Draft generated.");
      refresh();
    } catch (error) {
      showError(error, "Unable to generate draft.");
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft(draft: any, content: string, verificationStatus?: string) {
    try {
      setBusy(`draft-${draft.id}`);
      setNotice(null);
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          verificationStatus,
          changeSummary: verificationStatus ? `Marked ${verificationStatus}` : "Edited draft content"
        })
      });
      await requireOk(res, "Unable to save draft.");
      showSuccess("Draft saved.");
      refresh();
    } catch (error) {
      showError(error, "Unable to save draft.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteDraft(id: string) {
    try {
      setBusy(`draft-delete-${id}`);
      setNotice(null);
      const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      await requireOk(res, "Unable to delete draft.");
      showSuccess("Draft deleted.");
      refresh();
    } catch (error) {
      showError(error, "Unable to delete draft.");
    } finally {
      setBusy(null);
    }
  }

  async function sendProposal(
    assignmentId: string,
    feeProposal: number,
    probability: number,
    proposalNotes: string
  ) {
    try {
      setBusy(`proposal-${assignmentId}`);
      setNotice(null);
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "proposal", feeProposal, probability, proposalNotes })
      });
      await requireOk(res, "Unable to send proposal.");
      showSuccess("Proposal sent.");
      refresh();
    } catch (error) {
      showError(error, "Unable to send proposal.");
    } finally {
      setBusy(null);
    }
  }

  async function decideProposal(assignmentId: string, decision: "ACCEPTED" | "DECLINED") {
    try {
      setBusy(`decision-${assignmentId}`);
      setNotice(null);
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "decision", decision })
      });
      await requireOk(res, "Unable to update proposal.");
      showSuccess(decision === "ACCEPTED" ? "Proposal approved." : "Proposal declined.");
      refresh();
    } catch (error) {
      showError(error, "Unable to update proposal.");
    } finally {
      setBusy(null);
    }
  }

  async function reviewAgentAction(id: string, decision: "APPROVE" | "REJECT") {
    try {
      setBusy(`agent-action-${id}`);
      setNotice(null);
      const res = await fetch(`/api/ai/actions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, language })
      });
      await requireOk(res, "Unable to review assistant action.");
      showSuccess(decision === "APPROVE" ? "Assistant action approved." : "Assistant action rejected.");
      refresh();
    } catch (error) {
      showError(error, "Unable to review assistant action.");
    } finally {
      setBusy(null);
    }
  }

  async function generateHandoffPacket() {
    try {
      setBusy("handoff");
      setNotice(null);
      const res = await fetch("/api/handoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: initialCase.id })
      });
      await requireOk(res, "Unable to create lawyer handoff packet.");
      showSuccess("Lawyer handoff packet created.");
      refresh();
    } catch (error) {
      showError(error, "Unable to create lawyer handoff packet.");
    } finally {
      setBusy(null);
    }
  }

  async function generateCourtBundle() {
    try {
      setBusy("court-bundle");
      setNotice(null);
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: initialCase.id,
          bundleType: "court_ready_bundle",
          includePrivateNotes: role === "LAWYER"
        })
      });
      await requireOk(res, "Unable to create court-ready bundle.");
      showSuccess("Court-ready bundle created.");
      refresh();
    } catch (error) {
      showError(error, "Unable to create court-ready bundle.");
    } finally {
      setBusy(null);
    }
  }

  async function requestConsultation(input: {
    assignmentId?: string;
    lawyerProfileId?: string;
    scheduledAt?: string;
    notes?: string;
  }) {
    try {
      setBusy(`consultation-${input.assignmentId || input.lawyerProfileId || "new"}`);
      setNotice(null);
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: initialCase.id,
          assignmentId: input.assignmentId,
          lawyerProfileId: input.lawyerProfileId,
          scheduledAt: input.scheduledAt,
          notes: input.notes
        })
      });
      await requireOk(res, "Unable to request consultation.");
      showSuccess("Consultation request sent.");
      refresh();
    } catch (error) {
      showError(error, "Unable to request consultation.");
    } finally {
      setBusy(null);
    }
  }

  async function updateConsultation(id: string, updates: Record<string, unknown>) {
    try {
      setBusy(`consultation-${id}`);
      setNotice(null);
      const res = await fetch(`/api/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      await requireOk(res, "Unable to update consultation.");
      showSuccess("Consultation updated.");
      refresh();
    } catch (error) {
      showError(error, "Unable to update consultation.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-7 fade-in-up">
      {notice ? (
        <div
          className={cn(
            "rounded-2xl border p-4 text-sm shadow-sm transition-all",
            notice.type === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {notice.text}
        </div>
      ) : null}

      <GlassSurface
        className="min-w-0 overflow-hidden"
        borderRadius={34}
        borderGlow
        backgroundOpacity={0.14}
        blur={15}
        saturation={1.42}
        innerClassName="rounded-[inherit]"
      >
        <div className="p-0">
          <div className="relative overflow-hidden border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-7 sm:py-6">
            <div className="pointer-events-none absolute right-[-120px] top-[-140px] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-160px] left-[20%] h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="pointer-events-none absolute left-[-100px] top-[35%] h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-4">
                <div className="flex max-w-full flex-wrap gap-2">
                  <SafePill variant="outline">{toTitleCase(initialCase.category || "Uncategorized")}</SafePill>
                  <SafePill variant="secondary">{status}</SafePill>
                  <SafePill
                    variant={
                      priority === "HIGH" || priority === "CRITICAL" ? "destructive" : "warning"
                    }
                  >
                    {priority}
                  </SafePill>
                  <SafePill variant="success">
                    Health {Math.round(Number(initialCase.caseHealthScore) || 0)}%
                  </SafePill>
                  {!!pendingAssignments.length ? (
                    <SafePill variant="warning">
                      {pendingAssignments.length} pending request{pendingAssignments.length === 1 ? "" : "s"}
                    </SafePill>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-semibold tracking-tight md:text-3xl">
                    {initialCase.title}
                  </h1>
                  <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
                    Live legal workspace for structured case handling, evidence review,
                    drafting, deadlines, and verified collaboration.
                  </p>
                </div>
              </div>

              <div className="grid w-full min-w-0 grid-cols-2 gap-3 md:grid-cols-4 xl:max-w-[520px]">
                <MetricCard label="Documents" value={documents.length} />
                <MetricCard label="Deadlines" value={deadlines.length} />
                <MetricCard label="Drafts" value={drafts.length} />
                <MetricCard label="Activity" value={activityLogs.length} />
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
            <div className="min-w-0 space-y-5">
              <MiniSectionHeader
                icon={FolderOpen}
                title="Case details"
                description="Edit the live matter record, current stage, and case posture."
              />

              <div className="grid gap-3 md:grid-cols-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Case title" />
                <Input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Stage" />

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-border bg-background px-4 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                >
                  {["DRAFT", "INTAKE", "ACTIVE", "REVIEW", "ESCALATED", "CLOSED"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>

                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-border bg-background px-4 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                >
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the matter, the documents, and the relief you need."
                className="min-h-[120px]"
              />

              <div className="flex flex-wrap gap-3">
                <Button onClick={saveCase} disabled={busy === "case"}>
                  {busy === "case" ? "Saving..." : "Save case changes"}
                </Button>
                {role === "CLIENT" ? (
                  <Button variant="outline" onClick={deleteCase} disabled={busy === "delete-case"}>
                    Delete case
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ScoreCard label="Evidence strength" value={initialCase.evidenceStrength} tone="blue" />
              <ScoreCard label="Evidence completeness" value={initialCase.evidenceCompleteness} tone="emerald" />
              <ScoreCard label="Draft readiness" value={initialCase.draftReadiness} tone="amber" />
              <ScoreCard label="Escalation readiness" value={initialCase.escalationReadiness} tone="violet" />
            </div>
          </div>
        </div>
      </GlassSurface>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="min-w-0 space-y-6">
          <PanelCard>
            <MiniSectionHeader
              icon={Upload}
              title="Document intake and evidence vault"
              description="Upload files, generate grounded summaries, and turn them into searchable evidence."
              action={
                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:w-auto">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0])}
                  />
                  {uploading ? "Uploading..." : t(language, "uploadDocument")}
                </label>
              }
            />

            <div className="mt-5 space-y-3">
              {documents.map((document: any) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  busy={busy}
                  onAsk={() => setSelectedDocumentId(document.id)}
                  onDelete={() => removeDocument(document.id)}
                />
              ))}

              {!documents.length ? (
                <EmptyState text="No documents yet. Upload a contract, screenshot, PDF, email export, or notice to activate the workflow." />
              ) : null}
            </div>
          </PanelCard>

          {assignments.length ? (
            <PanelCard>
              <MiniSectionHeader
                icon={Scale}
                title="Lawyer request and proposal flow"
                description="Clients initiate the request. Lawyers review the live record, send a proposal, and contact details unlock only after approval."
              />

              <div className="mt-4 space-y-4">
                {assignments.map((assignment: any) => (
                  <ProposalCard
                    key={assignment.id}
                    assignment={assignment}
                    role={role}
                    currentUser={currentUser}
                    busy={busy}
                    onSendProposal={sendProposal}
                    onDecision={decideProposal}
                    caseContact={initialCase.client?.user}
                    clientProfile={initialCase.client}
                  />
                ))}
              </div>

              <ConsultationDesk
                assignments={assignments}
                consultations={consultationBookings}
                role={role}
                busy={busy}
                onRequest={requestConsultation}
                onUpdate={updateConsultation}
              />
            </PanelCard>
          ) : null}

          <AssistantPanel
            caseId={initialCase.id}
            documentId={selectedDocumentId}
            threads={initialCase.assistantThreads || []}
            role={role}
            simpleLanguageMode={simpleLanguageMode}
          />

          <AgentActionReviewQueue
            reviews={agentActionReviews}
            busy={busy}
            onReview={reviewAgentAction}
          />

          <PanelCard>
            <MiniSectionHeader
              icon={FileText}
              title={t(language, "draftingStudio")}
              description="Generate, edit, version, and verify legal drafts connected to this matter."
              action={
                <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <select
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value)}
                    className="h-10 w-full min-w-0 rounded-2xl border border-border bg-background px-4 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-primary/20 sm:w-[170px]"
                  >
                    {[
                      "LEGAL_NOTICE",
                      "COMPLAINT_LETTER",
                      "WARNING_LETTER",
                      "RESPONSE_LETTER",
                      "REFUND_REQUEST",
                      "GRIEVANCE_SUBMISSION",
                      "CONTRACT_REVISION",
                      "OPINION_BRIEF",
                      "OTHER"
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>

                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Draft title"
                    className="min-w-0 sm:w-[220px]"
                  />

                  <Button
                    className="w-full sm:w-auto"
                    onClick={generateDraft}
                    disabled={busy === "draft-generate"}
                  >
                    {busy === "draft-generate" ? "Thinking..." : t(language, "generate")}
                  </Button>
                </div>
              }
            />

            <div className="mt-4 space-y-4">
              {drafts.map((draft: any) => (
                <EditableDraftCard
                  key={draft.id}
                  draft={draft}
                  role={role}
                  busy={busy}
                  onSave={saveDraft}
                  onDelete={deleteDraft}
                />
              ))}

              {!drafts.length ? (
                <EmptyState text="No draft exists yet. Generate a legal notice, complaint, or response from the live case record." />
              ) : null}
            </div>
          </PanelCard>

          <PanelCard>
            <div className="grid gap-6 lg:grid-cols-2">
              <CollaborationPanel
                title={t(language, "sharedCollaboration")}
                description="Visible to both sides once the matter is being handled in the shared workspace."
                comments={comments}
                currentUser={currentUser}
                comment={comment}
                setComment={setComment}
                busy={busy}
                onSend={() => addComment("SHARED")}
                onDelete={removeComment}
              />

              {role === "LAWYER" ? (
                <InternalNotesPanel
                  notes={internalNotes}
                  privateNote={privateNote}
                  setPrivateNote={setPrivateNote}
                  busy={busy}
                  onSave={() => addComment("PRIVATE")}
                />
              ) : null}
            </div>
          </PanelCard>
        </div>

        <div className="min-w-0 space-y-6">
          <PanelCard>
            <MiniSectionHeader
              icon={CalendarClock}
              title={t(language, "timeline")}
              description="Live event log with key evidence dates and recommended next steps."
            />
            <div className="mt-4">
              <TimelineView items={timelineEvents} />
            </div>
          </PanelCard>

          <PanelCard>
            <MiniSectionHeader
              icon={CalendarClock}
              title={t(language, "deadlineTracker")}
              description="Track AI-detected and manual deadlines from the live file."
            />

            <div className="mt-4 space-y-3">
              {deadlines.map((deadline: any) => (
                <DeadlineRow
                  key={deadline.id}
                  deadline={deadline}
                  onToggle={() =>
                    updateDeadline(
                      deadline.id,
                      deadline.status === "COMPLETED" ? "UPCOMING" : "COMPLETED"
                    )
                  }
                  onDelete={() => deleteDeadline(deadline.id)}
                />
              ))}

              {!deadlines.length ? (
                <EmptyState compact text="No deadlines yet. Add one manually or upload a document for AI-detected dates." />
              ) : null}

              <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-dashed border-border p-4 sm:flex-row sm:flex-wrap sm:items-center">
                <Input
                  value={deadlineTitle}
                  onChange={(e) => setDeadlineTitle(e.target.value)}
                  placeholder="New deadline title"
                  className="min-w-0 flex-1 sm:min-w-[180px]"
                />
                <Input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="min-w-0 sm:w-[165px]"
                />
                <Button
                  className="w-full sm:w-auto"
                  onClick={addDeadline}
                  disabled={busy === "deadline" || !deadlineTitle.trim() || !deadlineDate}
                >
                  {busy === "deadline" ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </PanelCard>

          <PanelCard>
            <MiniSectionHeader
              icon={PackageCheck}
              title="Handoff and court bundles"
              description="Create lawyer handoff packets and court-ready organizers from the live workspace record."
              action={
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={generateHandoffPacket}
                    disabled={busy === "handoff"}
                  >
                    {busy === "handoff" ? "Preparing..." : "Lawyer handoff"}
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={generateCourtBundle}
                    disabled={busy === "court-bundle"}
                  >
                    {busy === "court-bundle" ? "Preparing..." : "Court bundle"}
                  </Button>
                </div>
              }
            />

            <div className="mt-4 space-y-3">
              {exportBundles.slice(0, 4).map((bundle: any) => (
                <div key={bundle.id} className="glass-subtle min-w-0 rounded-2xl p-4">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-medium">
                        {bundle.title || toTitleCase(bundle.bundleType || "Export bundle")}
                      </p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        {bundle.summary || toTitleCase(bundle.bundleType || "Export")} · {relativeDate(bundle.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <SafePill variant="outline">{bundle.bundleType}</SafePill>
                      <Button variant="outline" size="sm" asChild>
                        <a href={bundle.filePath} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" />
                          Open
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {!exportBundles.length ? (
                <EmptyState compact text="No export bundles yet. Create a handoff packet or court-ready organizer when the file is ready." />
              ) : null}
            </div>
          </PanelCard>

          <PanelCard>
            <MiniSectionHeader
              icon={Activity}
              title={t(language, "activity")}
              description="Recent structured actions taken on the case."
            />
            <div className="mt-4">
              <ActivityFeed items={activityLogs} />
            </div>
          </PanelCard>

          {role === "LAWYER" ? (
            <DebatePanel caseId={initialCase.id} sessions={initialCase.debateSessions || []} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AgentActionReviewQueue({
  reviews,
  busy,
  onReview
}: {
  reviews: any[];
  busy: string | null;
  onReview: (id: string, decision: "APPROVE" | "REJECT") => void;
}) {
  const pending = reviews.filter((review) => review.status === "PENDING");
  const recent = reviews.filter((review) => review.status !== "PENDING").slice(0, 3);

  return (
    <PanelCard>
      <MiniSectionHeader
        icon={ClipboardCheck}
        title="AI action review queue"
        description="Agent-proposed workspace changes wait here until you approve or reject them."
      />

      <div className="mt-4 space-y-3">
        {pending.map((review) => (
          <div key={review.id} className="glass-subtle min-w-0 rounded-2xl p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SafePill variant="warning">Pending approval</SafePill>
                  <SafePill variant="outline">{review.tool}</SafePill>
                </div>
                <p className="mt-3 break-words font-medium">{review.title}</p>
                {review.message ? (
                  <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                    {review.message}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => onReview(review.id, "APPROVE")}
                  disabled={busy === `agent-action-${review.id}`}
                >
                  {busy === `agent-action-${review.id}` ? "Applying..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReview(review.id, "REJECT")}
                  disabled={busy === `agent-action-${review.id}`}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}

        {!pending.length ? (
          <EmptyState compact text="No pending AI actions. When the assistant proposes a case update, draft, deadline, or roadmap, it will appear here for approval." />
        ) : null}

        {recent.length ? (
          <div className="grid gap-2">
            {recent.map((review) => (
              <div
                key={review.id}
                className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border/60 bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="min-w-0 break-words text-sm text-muted-foreground">{review.title}</p>
                <SafePill
                  variant={
                    review.status === "COMPLETED"
                      ? "success"
                      : review.status === "FAILED"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {review.status}
                </SafePill>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </PanelCard>
  );
}

function ConsultationDesk({
  assignments,
  consultations,
  role,
  busy,
  onRequest,
  onUpdate
}: {
  assignments: any[];
  consultations: any[];
  role: "CLIENT" | "LAWYER";
  busy: string | null;
  onRequest: (input: {
    assignmentId?: string;
    lawyerProfileId?: string;
    scheduledAt?: string;
    notes?: string;
  }) => void;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}) {
  const usableAssignments = assignments.filter((assignment) => assignment.status !== "DECLINED");

  return (
    <div className="mt-5 rounded-2xl border border-border/60 bg-muted/10 p-4">
      <MiniSectionHeader
        icon={CreditCard}
        title="Paid consultation desk"
        description="Request, propose, confirm, and track consultation slots connected to this case."
      />

      <div className="mt-4 space-y-3">
        {usableAssignments.slice(0, 3).map((assignment) => (
          <ConsultationRequestCard
            key={assignment.id}
            assignment={assignment}
            role={role}
            busy={busy}
            onRequest={onRequest}
          />
        ))}

        {consultations.map((consultation) => (
          <ConsultationStatusCard
            key={consultation.id}
            consultation={consultation}
            role={role}
            busy={busy}
            onUpdate={onUpdate}
          />
        ))}

        {!usableAssignments.length && !consultations.length ? (
          <EmptyState compact text="No lawyer is connected yet. Send a lawyer request first, then consultations can be proposed or requested here." />
        ) : null}
      </div>
    </div>
  );
}

function ConsultationRequestCard({
  assignment,
  role,
  busy,
  onRequest
}: {
  assignment: any;
  role: "CLIENT" | "LAWYER";
  busy: string | null;
  onRequest: (input: {
    assignmentId?: string;
    lawyerProfileId?: string;
    scheduledAt?: string;
    notes?: string;
  }) => void;
}) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const label = role === "LAWYER" ? "Propose consultation" : "Request consultation";
  const lawyerName = assignment.lawyer?.user?.name || "Lawyer";

  return (
    <div className="glass-subtle min-w-0 rounded-2xl p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium">{lawyerName}</p>
          <p className="break-words text-xs text-muted-foreground">
            {assignment.status === "ACCEPTED" ? "Engaged lawyer" : "Proposal/request in progress"}
          </p>
        </div>

        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
          className="min-w-0 lg:w-[210px]"
        />
        <Input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Short note"
          className="min-w-0 lg:w-[220px]"
        />
        <Button
          className="w-full lg:w-auto"
          onClick={() =>
            onRequest({
              assignmentId: assignment.id,
              scheduledAt,
              notes
            })
          }
          disabled={busy === `consultation-${assignment.id}`}
        >
          {busy === `consultation-${assignment.id}` ? "Sending..." : label}
        </Button>
      </div>
    </div>
  );
}

function ConsultationStatusCard({
  consultation,
  role,
  busy,
  onUpdate
}: {
  consultation: any;
  role: "CLIENT" | "LAWYER";
  busy: string | null;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}) {
  const [meetingLink, setMeetingLink] = useState(consultation.meetingLink || "");
  const [feeAmount, setFeeAmount] = useState(consultation.feeAmount || "");

  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words font-medium">
            {role === "LAWYER"
              ? consultation.client?.user?.name || "Client"
              : consultation.lawyer?.user?.name || "Lawyer"}
          </p>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {consultation.scheduledAt ? formatDate(consultation.scheduledAt) : "Slot not confirmed"} ·{" "}
            {consultation.durationMinutes || 30} min · {consultation.paymentStatus}
          </p>
        </div>

        <SafePill
          variant={
            consultation.status === "CONFIRMED" || consultation.status === "COMPLETED"
              ? "success"
              : consultation.status === "CANCELLED"
                ? "destructive"
                : "warning"
          }
        >
          {consultation.status}
        </SafePill>
      </div>

      {consultation.notes ? (
        <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">{consultation.notes}</p>
      ) : null}

      {role === "LAWYER" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input
            value={meetingLink}
            onChange={(event) => setMeetingLink(event.target.value)}
            placeholder="Meeting link"
          />
          <Input
            type="number"
            value={feeAmount}
            onChange={(event) => setFeeAmount(event.target.value)}
            placeholder="Fee"
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              size="sm"
              onClick={() =>
                onUpdate(consultation.id, {
                  status: "PROPOSED",
                  meetingLink,
                  feeAmount: Number(feeAmount || 0)
                })
              }
              disabled={busy === `consultation-${consultation.id}`}
            >
              Send terms
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdate(consultation.id, { status: "COMPLETED" })}
              disabled={busy === `consultation-${consultation.id}`}
            >
              Complete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate(consultation.id, { status: "CANCELLED" })}
              disabled={busy === `consultation-${consultation.id}`}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => onUpdate(consultation.id, { status: "CONFIRMED" })}
            disabled={busy === `consultation-${consultation.id}`}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdate(consultation.id, { paymentStatus: "PAID" })}
            disabled={busy === `consultation-${consultation.id}`}
          >
            Mark paid
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onUpdate(consultation.id, { status: "CANCELLED" })}
            disabled={busy === `consultation-${consultation.id}`}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function PanelCard({ children }: { children: ReactNode }) {
  return (
    <GlassSurface
      className="min-w-0 overflow-hidden soft-hover"
      borderRadius={28}
      backgroundOpacity={0.12}
      blur={14}
      saturation={1.36}
      innerClassName="p-5 sm:p-6"
    >
      {children}
    </GlassSurface>
  );
}

function MiniSectionHeader({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: any;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/30">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <p className="break-words text-sm font-medium tracking-tight">{title}</p>
          {description ? (
            <p className="mt-1 max-w-2xl break-words text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {action ? <div className="min-w-0 max-w-full sm:ml-auto">{action}</div> : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-subtle min-w-0 rounded-2xl px-4 py-3">
      <p className="text-wrap-safe text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "blue" | "emerald" | "amber" | "violet";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  const barClass = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500"
  }[tone];

  return (
    <div className="glass-subtle min-w-0 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-wrap-safe text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="shrink-0 text-sm font-semibold">{clamped}%</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted">
        <div
          className={cn("h-2 rounded-full transition-all duration-500", barClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function DocumentCard({
  document,
  busy,
  onAsk,
  onDelete
}: {
  document: any;
  busy: string | null;
  onAsk: () => void;
  onDelete: () => void;
}) {
  const documentUrl = `/api/documents/${document.id}`;
  const isImage = typeof document.mimeType === "string" && document.mimeType.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";

  return (
    <div className="glass-subtle min-w-0 rounded-2xl p-4 transition hover:border-primary/20 hover:shadow-[0_18px_36px_rgba(15,23,42,0.09)] dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.24)]">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 max-w-full break-words font-medium md:max-w-[420px]">
              {document.fileName}
            </p>
            {document.confidence ? (
              <SafePill variant="secondary">{Math.round(document.confidence * 100)}%</SafePill>
            ) : null}
            {document.probableCategory ? (
              <SafePill variant="outline">{document.probableCategory}</SafePill>
            ) : null}
          </div>

          {isImage ? (
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block overflow-hidden rounded-2xl border border-border/70 bg-muted/20"
            >
              <img
                src={documentUrl}
                alt={document.fileName}
                className="max-h-64 w-full object-contain"
                loading="lazy"
              />
            </a>
          ) : null}

          {isPdf ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
              <iframe
                src={documentUrl}
                title={document.fileName}
                className="h-[360px] w-full bg-background"
              />
            </div>
          ) : null}

          <div className="mt-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
            {document.aiSummary ? (
              <>
                <FormattedAiContent content={document.aiSummary} />
                <AiTranslationActions text={document.aiSummary} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Summary not ready yet.</p>
            )}
          </div>

          {asArray<string>(document.tags).length ? (
            <div className="mt-3 flex max-w-full flex-wrap gap-2">
              {asArray<string>(document.tags).map((tag) => (
                <SafePill key={tag} variant="outline">
                  {tag}
                </SafePill>
              ))}
            </div>
          ) : null}

          <p className="mt-3 text-xs text-muted-foreground">
            Uploaded {relativeDate(document.createdAt)}
          </p>
        </div>

        <div className="flex min-w-0 flex-row flex-wrap items-center gap-2 md:flex-col md:items-end">
          <Button variant="outline" size="sm" asChild>
            <a href={documentUrl} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
              View
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`${documentUrl}?download=1`}>
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={onAsk}>
            Ask AI
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={busy === `doc-${document.id}`}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeadlineRow({
  deadline,
  onToggle,
  onDelete
}: {
  deadline: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="glass-subtle min-w-0 rounded-2xl p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium">{deadline.title}</p>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            Due {formatDate(deadline.dueDate)}
            {deadline.notes ? ` · ${deadline.notes}` : ""}
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SafePill
            variant={
              deadline.status === "COMPLETED"
                ? "success"
                : deadline.status === "OVERDUE"
                  ? "destructive"
                  : "warning"
            }
          >
            {deadline.status}
          </SafePill>

          <Button size="sm" variant="ghost" onClick={onToggle}>
            {deadline.status === "COMPLETED" ? "Reopen" : "Complete"}
          </Button>

          <Button size="sm" variant="ghost" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-muted/10 text-sm leading-6 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
        compact ? "p-4" : "p-5"
      )}
    >
      {text}
    </div>
  );
}

function CollaborationPanel({
  title,
  description,
  comments,
  currentUser,
  comment,
  setComment,
  busy,
  onSend,
  onDelete
}: any) {
  return (
    <div className="min-w-0">
      <MiniSectionHeader icon={MessageSquare} title={title} description={description} />

      <div className="premium-scroll mt-3 max-h-[300px] space-y-3 overflow-y-auto pr-1">
        {comments.map((item: any) => (
          <div key={item.id} className="min-w-0 rounded-2xl border border-border/70 bg-background/70 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.author?.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{relativeDate(item.createdAt)}</p>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <SafePill variant="secondary">{item.visibility}</SafePill>
                {item.authorId === currentUser.id ? (
                  <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
              {item.body}
            </p>
          </div>
        ))}

        {!comments.length ? <EmptyState text="No shared messages yet." compact /> : null}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <Input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a shared case comment"
        />
        <Button onClick={onSend} disabled={busy === "comment" || !comment.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}

function InternalNotesPanel({
  notes,
  privateNote,
  setPrivateNote,
  busy,
  onSave
}: any) {
  return (
    <div className="min-w-0">
      <MiniSectionHeader
        icon={ShieldCheck}
        title="Internal notes"
        description="Visible only to the lawyer side of the case."
      />

      <div className="premium-scroll mt-3 max-h-[300px] space-y-3 overflow-y-auto pr-1">
        {notes.map((note: any) => (
          <div key={note.id} className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <p className="break-words text-sm leading-6 text-muted-foreground">{note.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {note.author?.name || "Lawyer"} · {relativeDate(note.createdAt)}
            </p>
          </div>
        ))}

        {!notes.length ? <EmptyState text="No internal notes yet." compact /> : null}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <Input
          value={privateNote}
          onChange={(e) => setPrivateNote(e.target.value)}
          placeholder="Add a lawyer-only internal note"
        />
        <Button onClick={onSave} disabled={busy === "comment" || !privateNote.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}

function ProposalCard({
  assignment,
  role,
  currentUser,
  busy,
  onSendProposal,
  onDecision,
  caseContact,
  clientProfile
}: any) {
  const [feeProposal, setFeeProposal] = useState(assignment.feeProposal || 0);
  const [probability, setProbability] = useState(
    Math.round((assignment.probability || 0.5) * 100)
  );
  const [proposalNotes, setProposalNotes] = useState(assignment.proposalNotes || "");

  const canEditProposal = role === "LAWYER" && assignment.lawyer?.userId === currentUser.id;
  const contactsUnlocked = assignment.status === "ACCEPTED";

  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_18px_36px_rgba(0,0,0,0.2)]">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium">{assignment.lawyer?.user?.name || "Lawyer"}</p>
          <p className="break-words text-sm text-muted-foreground">
            {assignment.lawyer?.firmName || "Independent practice"}
          </p>
        </div>
        <SafePill
          variant={
            assignment.status === "ACCEPTED"
              ? "success"
              : assignment.status === "DECLINED"
                ? "destructive"
                : "warning"
          }
        >
          {assignment.status}
        </SafePill>
      </div>

      {canEditProposal ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            type="number"
            value={feeProposal}
            onChange={(e) => setFeeProposal(Number(e.target.value || 0))}
            placeholder="Fee proposal"
          />
          <Input
            type="number"
            min={1}
            max={100}
            value={probability}
            onChange={(e) => setProbability(Number(e.target.value || 50))}
            placeholder="Win probability %"
          />
          <Textarea
            value={proposalNotes}
            onChange={(e) => setProposalNotes(e.target.value)}
            placeholder="Explain the fee, posture, and why you are a fit."
            className="min-h-[120px] md:col-span-2"
          />
          <div className="flex justify-end md:col-span-2">
            <Button
              onClick={() =>
                onSendProposal(assignment.id, feeProposal, probability / 100, proposalNotes)
              }
              disabled={busy === `proposal-${assignment.id}`}
            >
              {busy === `proposal-${assignment.id}` ? "Sending..." : "Send proposal"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
            {assignment.proposalNotes ? (
              <FormattedAiContent content={assignment.proposalNotes} />
            ) : (
              <p className="text-sm text-muted-foreground">Proposal not sent yet.</p>
            )}
          </div>

          <div className="mt-3 flex max-w-full flex-wrap gap-2">
            {assignment.feeProposal ? (
              <SafePill variant="outline">
                PKR {Number(assignment.feeProposal).toLocaleString()}
              </SafePill>
            ) : null}
            {assignment.probability ? (
              <SafePill variant="secondary">
                {Math.round(Number(assignment.probability) * 100)}% probability
              </SafePill>
            ) : null}
          </div>

          {role === "CLIENT" && assignment.status === "PENDING" ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={() => onDecision(assignment.id, "ACCEPTED")}
                disabled={busy === `decision-${assignment.id}`}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => onDecision(assignment.id, "DECLINED")}
                disabled={busy === `decision-${assignment.id}`}
              >
                Decline
              </Button>
            </div>
          ) : null}
        </>
      )}

      {contactsUnlocked ? (
        <div className="mt-4 break-words rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-6 text-muted-foreground">
          Contact unlocked for off-platform discussion. Lawyer email:{" "}
          {assignment.lawyer?.user?.email || "Not available"}
          {caseContact?.email ? ` · Client email: ${caseContact.email}` : ""}
          {clientProfile?.phone ? ` · Client phone: ${clientProfile.phone}` : ""}
        </div>
      ) : null}
    </div>
  );
}

function EditableDraftCard({ draft, role, busy, onSave, onDelete }: any) {
  const [content, setContent] = useState(draft.currentContent || "");

  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_18px_36px_rgba(0,0,0,0.2)]">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium">{draft.title}</p>
          <p className="break-words text-xs text-muted-foreground">
            {toTitleCase(draft.type)} · {asArray(draft.versions).length} versions
          </p>
        </div>

        <SafePill
          variant={
            draft.verificationStatus === "VERIFIED"
              ? "success"
              : draft.verificationStatus === "NEEDS_CORRECTION"
                ? "destructive"
                : "warning"
          }
        >
          {draft.verificationStatus || "AI_GENERATED"}
        </SafePill>
      </div>

      <Textarea
        className="mt-3 min-h-[200px]"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-3">
        <Button onClick={() => onSave(draft, content)} disabled={busy === `draft-${draft.id}`}>
          Save version
        </Button>

        {role === "LAWYER" ? (
          <>
            <Button variant="outline" onClick={() => onSave(draft, content, "VERIFIED")}>
              Mark verified
            </Button>
            <Button variant="outline" onClick={() => onSave(draft, content, "NEEDS_CORRECTION")}>
              Needs correction
            </Button>
          </>
        ) : null}

        <Button
          variant="ghost"
          onClick={() => onDelete(draft.id)}
          disabled={busy === `draft-delete-${draft.id}`}
        >
          Delete
        </Button>
      </div>

      {asArray(draft.versions).length ? (
        <div className="mt-4 flex max-w-full flex-wrap gap-2">
          {asArray(draft.versions).slice(0, 4).map((version: any) => (
            <SafePill key={version.id} variant="outline">
              v{version.versionNumber}
            </SafePill>
          ))}
        </div>
      ) : null}
    </div>
  );
}
