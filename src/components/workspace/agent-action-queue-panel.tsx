"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  FolderKanban,
  Loader2,
  ShieldCheck,
  Sparkles,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { cn, formatDate, relativeDate, toTitleCase } from "@/lib/utils";

type WorkflowStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REJECTED" | string;

export type AgentWorkflowReviewItem = {
  id: string;
  tool: string;
  title: string;
  message?: string | null;
  status: WorkflowStatus;
  arguments: unknown;
  resultMessage?: string | null;
  resultAction?: unknown;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  caseId?: string | null;
  documentId?: string | null;
  legalCase?: {
    id: string;
    title: string;
    category: string;
    status: string;
  } | null;
  document?: {
    id: string;
    fileName: string;
    mimeType: string;
  } | null;
};

type Filter = "ALL" | "PENDING" | "COMPLETED" | "FAILED" | "REJECTED";

const FILTERS: Filter[] = ["ALL", "PENDING", "COMPLETED", "FAILED", "REJECTED"];

export function AgentActionQueuePanel({
  initialReviews,
  assistantHref
}: {
  initialReviews: AgentWorkflowReviewItem[];
  assistantHref: string;
}) {
  const router = useRouter();
  const language = useLanguage();
  const [reviews, setReviews] = useState(initialReviews);
  const [activeFilter, setActiveFilter] = useState<Filter>("PENDING");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      pending: reviews.filter((item) => item.status === "PENDING" || item.status === "PROCESSING").length,
      completed: reviews.filter((item) => item.status === "COMPLETED").length,
      failed: reviews.filter((item) => item.status === "FAILED").length,
      rejected: reviews.filter((item) => item.status === "REJECTED").length
    }),
    [reviews]
  );

  const visibleReviews = useMemo(() => {
    if (activeFilter === "ALL") return reviews;
    if (activeFilter === "PENDING") {
      return reviews.filter((item) => item.status === "PENDING" || item.status === "PROCESSING");
    }
    return reviews.filter((item) => item.status === activeFilter);
  }, [activeFilter, reviews]);

  async function decide(reviewId: string, decision: "APPROVE" | "REJECT") {
    if (busyId) return;
    setBusyId(reviewId);
    setError(null);

    setReviews((current) =>
      current.map((item) =>
        item.id === reviewId && decision === "APPROVE"
          ? { ...item, status: "PROCESSING" }
          : item
      )
    );

    try {
      const res = await fetch(`/api/ai/actions/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, language })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.review) {
        throw new Error(data?.error || "This assistant action could not be completed.");
      }

      const nextReview = normalizeReview(data.review);
      setReviews((current) =>
        current.map((item) =>
          item.id === reviewId
            ? {
                ...item,
                ...nextReview,
                legalCase: nextReview.legalCase || item.legalCase,
                document: nextReview.document || item.document
              }
            : item
        )
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "This assistant action could not be completed.");
      setReviews((current) =>
        current.map((item) =>
          item.id === reviewId && item.status === "PROCESSING"
            ? { ...item, status: "PENDING" }
            : item
        )
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 fade-in-up">
      <div className="grid gap-4 md:grid-cols-4">
        <WorkflowStat icon={Clock3} label="Pending" value={stats.pending} tone="warning" />
        <WorkflowStat icon={CheckCircle2} label="Completed" value={stats.completed} tone="success" />
        <WorkflowStat icon={XCircle} label="Needs review" value={stats.failed} tone="destructive" />
        <WorkflowStat icon={ShieldCheck} label="Rejected" value={stats.rejected} tone="neutral" />
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                Agent action review queue
              </CardTitle>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review database-changing AI actions before MIZAN saves them. Approving runs the same permission-safe backend tools used by the assistant.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full md:w-auto">
              <Link href={assistantHref}>
                <Bot className="mr-2 h-4 w-4" />
                Open assistant
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "glass-chip rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                  activeFilter === filter
                    ? "border-primary/50 bg-primary/10 text-primary shadow-soft"
                    : "text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {filter === "ALL" ? "All" : toTitleCase(filter)}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {visibleReviews.length ? (
            <div className="space-y-4">
              {visibleReviews.map((review) => (
                <WorkflowReviewCard
                  key={review.id}
                  review={review}
                  busy={busyId === review.id}
                  onApprove={() => decide(review.id, "APPROVE")}
                  onReject={() => decide(review.id, "REJECT")}
                />
              ))}
            </div>
          ) : (
            <EmptyWorkflowState activeFilter={activeFilter} assistantHref={assistantHref} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WorkflowStat({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Bot;
  label: string;
  value: number;
  tone: "success" | "warning" | "destructive" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : tone === "destructive"
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          : "bg-primary/10 text-primary";

  return (
    <Card className="soft-hover">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowReviewCard({
  review,
  busy,
  onApprove,
  onReject
}: {
  review: AgentWorkflowReviewItem;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const pending = review.status === "PENDING";
  const processing = review.status === "PROCESSING";
  const caseDeleted = isDeletedCaseWorkflow(review);
  const actionHref = caseDeleted ? "" : getActionHref(review.resultAction);
  const actionLabel = isCaseHref(actionHref) ? "Open case" : "Open result";
  const summary = summarizeArguments(review.arguments);

  return (
    <div className="glass-subtle rounded-[1.35rem] p-4 transition hover:-translate-y-0.5 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(review.status)} className="rounded-full px-3 py-1">
              {processing ? "Processing" : toTitleCase(review.status)}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {toTitleCase(review.tool)}
            </Badge>
            {review.legalCase ? (
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <FolderKanban className="mr-1 h-3.5 w-3.5" />
                {review.legalCase.title}
              </Badge>
            ) : caseDeleted ? (
              <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300">
                <FolderKanban className="mr-1 h-3.5 w-3.5" />
                Case deleted
              </Badge>
            ) : null}
            {review.document ? (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                <FileText className="mr-1 h-3.5 w-3.5" />
                {review.document.fileName}
              </Badge>
            ) : null}
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-tight">{review.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {review.message || "This AI workflow is waiting for review before it changes your workspace."}
            </p>
          </div>

          {summary.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {summary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/60 bg-background/35 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {review.resultMessage ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm leading-6 text-muted-foreground">
              {review.resultMessage}
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Proposed {relativeDate(review.createdAt)} on {formatDate(review.createdAt, "dd MMM yyyy, h:mm a")}
            {review.reviewedAt ? ` - reviewed ${relativeDate(review.reviewedAt)}` : ""}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col">
          {pending || processing ? (
            <>
              <Button type="button" disabled={busy || processing} onClick={onApprove} className="w-full lg:w-[150px]">
                {busy || processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || processing}
                onClick={onReject}
                className="w-full lg:w-[150px]"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          ) : caseDeleted ? (
            <Button type="button" variant="outline" disabled className="w-full lg:w-[150px]">
              <XCircle className="mr-2 h-4 w-4" />
              Case deleted
            </Button>
          ) : actionHref ? (
            <Button asChild className="w-full lg:w-[150px]">
              <Link href={actionHref}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {actionLabel}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyWorkflowState({
  activeFilter,
  assistantHref
}: {
  activeFilter: Filter;
  assistantHref: string;
}) {
  return (
    <div className="flex min-h-[340px] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-muted/20 p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" />
        </div>
        <h3 className="mt-5 text-xl font-semibold tracking-tight">
          {activeFilter === "PENDING" ? "No pending AI actions" : "No actions in this view"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Ask the assistant to create a case, build a roadmap, prepare a draft, add a deadline, or organize evidence. The proposed action will appear here before anything is saved.
        </p>
        <Button asChild className="mt-5">
          <Link href={assistantHref}>Start with the assistant</Link>
        </Button>
      </div>
    </div>
  );
}

function statusVariant(status: WorkflowStatus): "success" | "destructive" | "warning" | "outline" {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "PENDING" || status === "PROCESSING") return "warning";
  return "outline";
}

function normalizeReview(raw: any): AgentWorkflowReviewItem {
  return {
    id: String(raw.id),
    tool: String(raw.tool || "assistant_action"),
    title: String(raw.title || "Assistant action"),
    message: raw.message || null,
    status: String(raw.status || "PENDING"),
    arguments: raw.arguments || {},
    resultMessage: raw.resultMessage || null,
    resultAction: raw.resultAction || null,
    reviewedAt: raw.reviewedAt ? new Date(raw.reviewedAt).toISOString() : null,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    caseId: raw.caseId || null,
    documentId: raw.documentId || null,
    legalCase: raw.legalCase || raw.case || null,
    document: raw.document || null
  };
}

function getActionHref(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const action = (value as { action?: { href?: unknown }; href?: unknown }).action;
  if (action && typeof action.href === "string") return action.href;
  const directHref = (value as { href?: unknown }).href;
  return typeof directHref === "string" ? directHref : "";
}

function isCaseHref(href: string) {
  return /^\/(?:client|lawyer)\/cases\/[^/?#]+(?:$|[/?#])/.test(href);
}

function isDeletedCaseWorkflow(review: AgentWorkflowReviewItem) {
  const resultAction = review.resultAction;
  if (resultAction && typeof resultAction === "object") {
    const record = resultAction as Record<string, unknown>;
    if (record.caseDeleted === true || typeof record.deletedCaseId === "string") return true;
    const action = record.action;
    if (action && typeof action === "object" && (action as Record<string, unknown>).type === "case_deleted") {
      return true;
    }
  }

  const href = getActionHref(resultAction);
  return Boolean(href && isCaseHref(href) && !review.legalCase);
}

function summarizeArguments(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  const priorityKeys = [
    "title",
    "category",
    "priority",
    "status",
    "stage",
    "dueDate",
    "eventDate",
    "documentType",
    "draftType",
    "description",
    "summary",
    "facts",
    "availableEvidence",
    "evidenceGaps",
    "recommendedNextSteps"
  ];

  return priorityKeys
    .filter((key) => key in record)
    .map((key) => ({ label: toTitleCase(key), value: stringifyPreview(record[key]) }))
    .filter((item) => item.value)
    .slice(0, 6);
}

function stringifyPreview(value: unknown) {
  if (value === null || typeof value === "undefined") return "";
  if (Array.isArray(value)) {
    return value
      .slice(0, 4)
      .map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)))
      .join("; ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  const text = String(value);
  return text.length > 220 ? `${text.slice(0, 220)}...` : text;
}
