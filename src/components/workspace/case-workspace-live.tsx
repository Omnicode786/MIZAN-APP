"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarClock,
  FileText,
  FolderOpen,
  MessageSquare,
  Scale,
  ShieldCheck,
  Upload
} from "lucide-react";
import { AiTranslationActions } from "@/components/ai-translation-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const pendingAssignments = useMemo(
    () => (initialCase.assignments || []).filter((item: any) => item.status === "PENDING"),
    [initialCase.assignments]
  );

  async function refresh() {
    router.refresh();
  }

  async function saveCase() {
    setBusy("case");
    await fetch(`/api/cases/${initialCase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, stage, status, priority })
    });
    setBusy(null);
    refresh();
  }

  async function deleteCase() {
    if (!confirm("Delete this case and all its records?")) return;
    setBusy("delete-case");
    const res = await fetch(`/api/cases/${initialCase.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) router.push(role === "CLIENT" ? "/client/cases" : "/lawyer/cases");
  }

  async function uploadDocument(file: File) {
    const form = new FormData();
    form.append("caseId", initialCase.id);
    form.append("file", file);
    form.append("language", language);
    setUploading(true);
    await fetch("/api/documents/upload", { method: "POST", body: form });
    setUploading(false);
    refresh();
  }

  async function removeDocument(id: string) {
    setBusy(`doc-${id}`);
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setBusy(null);
    refresh();
  }

  async function addComment(visibility: "SHARED" | "PRIVATE" = "SHARED") {
    const body = visibility === "PRIVATE" ? privateNote : comment;
    if (!body.trim()) return;

    setBusy("comment");
    await fetch(visibility === "PRIVATE" ? "/api/internal-notes" : "/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: initialCase.id, body })
    });
    setBusy(null);
    setComment("");
    setPrivateNote("");
    refresh();
  }

  async function removeComment(id: string) {
    setBusy(`comment-${id}`);
    await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    setBusy(null);
    refresh();
  }

  async function addDeadline() {
    if (!deadlineTitle.trim() || !deadlineDate) return;

    setBusy("deadline");
    await fetch("/api/deadlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: initialCase.id,
        title: deadlineTitle,
        dueDate: deadlineDate,
        importance: "HIGH"
      })
    });
    setBusy(null);
    setDeadlineTitle("");
    setDeadlineDate("");
    refresh();
  }

  async function updateDeadline(id: string, statusValue: string) {
    setBusy(`deadline-${id}`);
    await fetch("/api/deadlines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: statusValue })
    });
    setBusy(null);
    refresh();
  }

  async function deleteDeadline(id: string) {
    setBusy(`deadline-${id}`);
    await fetch("/api/deadlines", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    setBusy(null);
    refresh();
  }

  async function generateDraft() {
    setBusy("draft-generate");
    await fetch("/api/drafts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: initialCase.id, title: draftTitle, type: draftType, language })
    });
    setBusy(null);
    refresh();
  }

  async function saveDraft(draft: any, content: string, verificationStatus?: string) {
    setBusy(`draft-${draft.id}`);
    await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        verificationStatus,
        changeSummary: verificationStatus ? `Marked ${verificationStatus}` : "Edited draft content"
      })
    });
    setBusy(null);
    refresh();
  }

  async function deleteDraft(id: string) {
    setBusy(`draft-delete-${id}`);
    await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    setBusy(null);
    refresh();
  }

  async function sendProposal(
    assignmentId: string,
    feeProposal: number,
    probability: number,
    proposalNotes: string
  ) {
    setBusy(`proposal-${assignmentId}`);
    await fetch(`/api/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "proposal", feeProposal, probability, proposalNotes })
    });
    setBusy(null);
    refresh();
  }

  async function decideProposal(assignmentId: string, decision: "ACCEPTED" | "DECLINED") {
    setBusy(`decision-${assignmentId}`);
    await fetch(`/api/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "decision", decision })
    });
    setBusy(null);
    refresh();
  }

  return (
    <div className="space-y-7">
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border/60 bg-muted/20 px-6 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{toTitleCase(initialCase.category)}</Badge>
                  <Badge variant="secondary">{status}</Badge>
                  <Badge
                    variant={
                      priority === "HIGH" || priority === "CRITICAL" ? "destructive" : "warning"
                    }
                  >
                    {priority}
                  </Badge>
                  <Badge variant="success">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    Health {Math.round(initialCase.caseHealthScore)}%
                  </Badge>
                  {!!pendingAssignments.length && (
                    <Badge variant="warning">{pendingAssignments.length} pending request(s)</Badge>
                  )}
                </div>

                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{initialCase.title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Live legal workspace for structured case handling, evidence review, drafting,
                    deadlines, and verified collaboration.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:w-[500px]">
                <MetricCard label="Documents" value={initialCase.documents?.length || 0} />
                <MetricCard label="Deadlines" value={initialCase.deadlines?.length || 0} />
                <MetricCard label="Drafts" value={initialCase.drafts?.length || 0} />
                <MetricCard label="Activity" value={initialCase.activityLogs?.length || 0} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
            <div className="space-y-5">
              <SectionHeader
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
                  className="h-10 w-full rounded-2xl border border-border bg-background px-4 text-sm shadow-sm"
                >
                  {["DRAFT", "INTAKE", "ACTIVE", "REVIEW", "ESCALATED", "CLOSED"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>

                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-border bg-background px-4 text-sm shadow-sm"
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
                  {busy === "case" ? "Saving…" : "Save case changes"}
                </Button>
                {role === "CLIENT" ? (
                  <Button variant="outline" onClick={deleteCase} disabled={busy === "delete-case"}>
                    Delete case
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ScoreCard
                label="Evidence strength"
                value={initialCase.evidenceStrength}
                tone="blue"
              />
              <ScoreCard
                label="Evidence completeness"
                value={initialCase.evidenceCompleteness}
                tone="emerald"
              />
              <ScoreCard
                label="Draft readiness"
                value={initialCase.draftReadiness}
                tone="amber"
              />
              <ScoreCard
                label="Escalation readiness"
                value={initialCase.escalationReadiness}
                tone="violet"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 sm:p-6">
              <SectionHeader
                icon={Upload}
                title="Document intake and evidence vault"
                description="Upload files, generate grounded summaries, and turn them into searchable evidence."
                action={
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
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
                {initialCase.documents.map((document: any) => (
                  <div
                    key={document.id}
                    className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm transition hover:border-border"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{document.fileName}</p>
                          {document.confidence ? (
                            <Badge variant="secondary">
                              {Math.round(document.confidence * 100)}%
                            </Badge>
                          ) : null}
                          {document.probableCategory ? (
                            <Badge variant="outline">{document.probableCategory}</Badge>
                          ) : null}
                        </div>

                        <div className="mt-3 rounded-xl bg-muted/25 p-3">
                          {document.aiSummary ? (
                            <>
                              <FormattedAiContent content={document.aiSummary} />
                              <AiTranslationActions text={document.aiSummary} />
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Summary not ready yet.
                            </p>
                          )}
                        </div>

                        {(document.tags || []).length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(document.tags || []).map((tag: string) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}

                        <p className="mt-3 text-xs text-muted-foreground">
                          Uploaded {relativeDate(document.createdAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 md:flex-col md:items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDocumentId(document.id)}
                        >
                          Ask AI about this
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(document.id)}
                          disabled={busy === `doc-${document.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {!initialCase.documents.length ? (
                  <EmptyState text="No documents yet. Upload a contract, screenshot, PDF, email export, or notice to activate the workflow." />
                ) : null}
              </div>
            </CardContent>
          </Card>

          {(role === "CLIENT" || role === "LAWYER") && initialCase.assignments?.length ? (
            <Card>
              <CardContent className="space-y-4 p-5 sm:p-6">
                <SectionHeader
                  icon={Scale}
                  title="Lawyer request and proposal flow"
                  description="Clients initiate the request. Lawyers review the live record, send a proposal, and contact details unlock only after approval."
                />

                {initialCase.assignments.map((assignment: any) => (
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
              </CardContent>
            </Card>
          ) : null}

          <AssistantPanel
            caseId={initialCase.id}
            documentId={selectedDocumentId}
            threads={initialCase.assistantThreads || []}
            role={role}
            simpleLanguageMode={simpleLanguageMode}
          />

          <Card>
            <CardContent className="p-5 sm:p-6">
              <SectionHeader
                icon={FileText}
                title={t(language, "draftingStudio")}
                action={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    <select
                      value={draftType}
                      onChange={(e) => setDraftType(e.target.value)}
                      className="h-10 w-full rounded-2xl border border-border bg-background px-4 text-sm shadow-sm sm:w-auto"
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
                      className="w-full sm:w-56"
                    />

                    <Button onClick={generateDraft} disabled={busy === "draft-generate"} className="sm:self-auto">
                      {busy === "draft-generate" ? "Generating..." : t(language, "generate")}
                    </Button>
                  </div>
                }
              />

              <div className="mt-4 space-y-4">
                {initialCase.drafts.map((draft: any) => (
                  <EditableDraftCard
                    key={draft.id}
                    draft={draft}
                    role={role}
                    busy={busy}
                    onSave={saveDraft}
                    onDelete={deleteDraft}
                  />
                ))}

                {!initialCase.drafts.length ? (
                  <EmptyState text="No draft exists yet. Generate a legal notice, complaint, or response from the live case record." />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <SectionHeader
                    icon={MessageSquare}
                    title={t(language, "sharedCollaboration")}
                    description="Visible to both sides once the matter is being handled in the shared workspace."
                  />

                  <div className="mt-3 max-h-[300px] space-y-3 overflow-y-auto pr-1">
                    {initialCase.comments.map((item: any) => (
                      <div key={item.id} className="rounded-2xl border border-border/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.author?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {relativeDate(item.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{item.visibility}</Badge>
                            {item.authorId === currentUser.id ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeComment(item.id)}
                              >
                                Delete
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {item.body}
                        </p>
                      </div>
                    ))}

                    {!initialCase.comments.length ? (
                      <EmptyState text="No shared messages yet." compact />
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a shared case comment"
                    />
                    <Button
                      onClick={() => addComment("SHARED")}
                      disabled={busy === "comment" || !comment.trim()}
                    >
                      Send
                    </Button>
                  </div>
                </div>

                {role === "LAWYER" ? (
                  <div>
                    <SectionHeader
                      icon={ShieldCheck}
                      title={t(language, "internalNotes")}
                      description="Visible only to the lawyer side of the case."
                    />

                    <div className="mt-3 max-h-[300px] space-y-3 overflow-y-auto pr-1">
                      {initialCase.internalNotes.map((note: any) => (
                        <div
                          key={note.id}
                          className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                        >
                          <p className="text-sm leading-6 text-muted-foreground">{note.body}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {note.author?.name} · {relativeDate(note.createdAt)}
                          </p>
                        </div>
                      ))}

                      {!initialCase.internalNotes.length ? (
                        <EmptyState text="No internal notes yet." compact />
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <Input
                        value={privateNote}
                        onChange={(e) => setPrivateNote(e.target.value)}
                        placeholder="Add a lawyer-only internal note"
                      />
                      <Button
                        onClick={() => addComment("PRIVATE")}
                        disabled={busy === "comment" || !privateNote.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 sm:p-6">
              <SectionHeader
                icon={CalendarClock}
                title={t(language, "timeline")}
                description="Minimal event log with key evidence dates and recommended next steps."
              />
              <div className="mt-4">
                <TimelineView items={initialCase.timelineEvents || []} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 sm:p-6">
              <SectionHeader
                icon={CalendarClock}
                title={t(language, "deadlineTracker")}
                description="Track AI-detected and manual deadlines from the live file."
              />

              <div className="mt-4 space-y-3">
                {(initialCase.deadlines || []).map((deadline: any) => (
                  <div key={deadline.id} className="rounded-2xl border border-border/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Due {formatDate(deadline.dueDate)}
                          {deadline.notes ? ` · ${deadline.notes}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            deadline.status === "COMPLETED"
                              ? "success"
                              : deadline.status === "OVERDUE"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {deadline.status}
                        </Badge>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateDeadline(
                              deadline.id,
                              deadline.status === "COMPLETED" ? "UPCOMING" : "COMPLETED"
                            )
                          }
                        >
                          {deadline.status === "COMPLETED" ? "Reopen" : "Complete"}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDeadline(deadline.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="grid gap-3 rounded-2xl border border-dashed border-border p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <Input
                    value={deadlineTitle}
                    onChange={(e) => setDeadlineTitle(e.target.value)}
                    placeholder="New deadline title"
                  />
                  <Input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                  />
                  <Button onClick={addDeadline} disabled={busy === "deadline"}>
                    {busy === "deadline" ? "Adding…" : "Add"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 sm:p-6">
              <SectionHeader
                icon={Activity}
                title={t(language, "activity")}
                description="Recent structured actions taken on the case."
              />
              <div className="mt-4">
                <ActivityFeed items={initialCase.activityLogs || []} />
              </div>
            </CardContent>
          </Card>

          {role === "LAWYER" ? (
            <DebatePanel caseId={initialCase.id} sessions={initialCase.debateSessions || []} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: any;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-2.5">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium tracking-tight">{title}</p>
          {description ? (
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0 self-start">{action}</div> : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
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
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{clamped}%</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted">
        <div
          className={cn("h-2 rounded-full transition-all", barClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border text-sm text-muted-foreground",
        compact ? "p-4" : "p-5"
      )}
    >
      {text}
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

  const canEditProposal = role === "LAWYER" && assignment.lawyer.userId === currentUser.id;
  const contactsUnlocked = assignment.status === "ACCEPTED";

  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">{assignment.lawyer.user.name}</p>
          <p className="text-sm text-muted-foreground">
            {assignment.lawyer.firmName || "Independent practice"}
          </p>
        </div>
        <Badge
          variant={
            assignment.status === "ACCEPTED"
              ? "success"
              : assignment.status === "DECLINED"
                ? "destructive"
                : "warning"
          }
        >
          {assignment.status}
        </Badge>
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
          <div className="md:col-span-2">
            <Textarea
              value={proposalNotes}
              onChange={(e) => setProposalNotes(e.target.value)}
              placeholder="Explain the fee, posture, and why you are a fit."
              className="min-h-[120px]"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button
              onClick={() =>
                onSendProposal(assignment.id, feeProposal, probability / 100, proposalNotes)
              }
              disabled={busy === `proposal-${assignment.id}`}
            >
              {busy === `proposal-${assignment.id}` ? "Sending…" : "Send proposal"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-xl bg-muted/25 p-3">
            {assignment.proposalNotes ? (
              <FormattedAiContent content={assignment.proposalNotes} />
            ) : (
              <p className="text-sm text-muted-foreground">Proposal not sent yet.</p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {assignment.feeProposal ? (
              <Badge variant="outline">
                PKR {Number(assignment.feeProposal).toLocaleString()}
              </Badge>
            ) : null}
            {assignment.probability ? (
              <Badge variant="secondary">
                {Math.round(Number(assignment.probability) * 100)}% probability
              </Badge>
            ) : null}
          </div>

          {role === "CLIENT" && assignment.status === "PENDING" ? (
            <div className="mt-4 flex gap-3">
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
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-muted-foreground">
          Contact unlocked for off-platform discussion. Lawyer email:{" "}
          {assignment.lawyer.user.email}
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
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{draft.title}</p>
          <p className="text-xs text-muted-foreground">
            {toTitleCase(draft.type)} · {draft.versions?.length || 0} versions
          </p>
        </div>

        <Badge
          variant={
            draft.verificationStatus === "VERIFIED"
              ? "success"
              : draft.verificationStatus === "NEEDS_CORRECTION"
                ? "destructive"
                : "warning"
          }
        >
          {draft.verificationStatus}
        </Badge>
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
          <Button variant="outline" onClick={() => onSave(draft, content, "VERIFIED")}>
            Mark verified
          </Button>
        ) : null}
        {role === "LAWYER" ? (
          <Button variant="outline" onClick={() => onSave(draft, content, "NEEDS_CORRECTION")}>
            Needs correction
          </Button>
        ) : null}
        <Button
          variant="ghost"
          onClick={() => onDelete(draft.id)}
          disabled={busy === `draft-delete-${draft.id}`}
        >
          Delete
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(draft.versions || []).slice(0, 4).map((version: any) => (
          <Badge key={version.id} variant="outline">
            v{version.versionNumber}
          </Badge>
        ))}
      </div>
    </div>
  );
}
