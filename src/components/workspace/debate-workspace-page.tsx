"use client";

import { useMemo, useState } from "react";
import {
  BrainCircuit,
  FileText,
  Gavel,
  Scale,
  TimerReset,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AiTranslationActions } from "@/components/ai-translation-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { FormattedAiContent } from "@/utils/ai-content";
import { cn, formatDate, relativeDate, toTitleCase } from "@/lib/utils";

type DebateWorkspacePageProps = {
  user: any;
  cases: any[];
};

export function DebateWorkspacePage({
  user,
  cases
}: DebateWorkspacePageProps) {
  const router = useRouter();
  const language = useLanguage();

  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id || "");
  const [title, setTitle] = useState("Opposition simulation");
  const [duration, setDuration] = useState(8);
  const [argument, setArgument] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const activeSession = useMemo(() => {
    if (!selectedCase?.debateSessions?.length) return null;
    return (
      selectedCase.debateSessions.find((item: any) => item.status === "ACTIVE") ||
      selectedCase.debateSessions[0]
    );
  }, [selectedCase]);

  async function startSession() {
    if (!selectedCase) return;

    setLoading(true);

    const res = await fetch("/api/debate/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: selectedCase.id, title, durationMinutes: duration, language })
    });

    setLoading(false);

    if (res.ok) {
      router.refresh();
    }
  }

  async function sendTurn() {
    if (!activeSession || !argument.trim()) return;

    setLoading(true);

    const res = await fetch(`/api/debate/session/${activeSession.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: argument, language })
    });

    setLoading(false);

    if (res.ok) {
      setArgument("");
      router.refresh();
    }
  }

  async function finalize() {
    if (!activeSession) return;

    setLoading(true);

    const res = await fetch(`/api/debate/session/${activeSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language })
    });

    setLoading(false);

    if (res.ok) {
      router.refresh();
    }
  }

  if (!cases.length) {
    return (
      <Card>
        <CardContent className="p-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <Scale className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{t(language, "debateMode")}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              No lawyer-assigned cases are available yet. Once a client shares a case
              with you, it will appear here for adversarial AI review.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70">
        <CardContent className="p-0">
          <div className="border-b border-border/60 bg-muted/20 px-6 py-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Lawyer-only adversarial AI workspace
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {t(language, "debateMode")}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Select a live case, let the AI argue as opposing counsel using the
                  case record, submit your rebuttals round by round, and end with a
                  probabilistic outcome analysis grounded in the matter.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="Available cases" value={cases.length} />
                <MiniStat
                  label="Active debate"
                  value={activeSession?.status === "ACTIVE" ? "Yes" : "No"}
                />
                <MiniStat
                  label="Selected case"
                  value={selectedCase ? toTitleCase(selectedCase.status) : "None"}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card className="border-border/70 shadow-none">
                <CardContent className="p-5">
                  <SectionHeader
                    icon={Gavel}
                    title="1. Select case"
                    description="Choose the matter you want to debate."
                  />

                  <div className="mt-4">
                    <select
                      value={selectedCaseId}
                      onChange={(e) => setSelectedCaseId(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm"
                    >
                      {cases.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCase ? (
                    <div className="mt-4 rounded-2xl border border-border/70 bg-background p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{toTitleCase(selectedCase.category)}</Badge>
                        <Badge variant="secondary">{selectedCase.status}</Badge>
                        <Badge variant="warning">{selectedCase.priority}</Badge>
                      </div>

                      <h3 className="mt-3 font-medium">{selectedCase.title}</h3>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {selectedCase.description || "No case description available yet."}
                      </p>

                      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                        <p>
                          Client: {selectedCase.client?.user?.name || "Unknown client"}
                        </p>
                        <p>
                          Last updated: {relativeDate(selectedCase.updatedAt)}
                        </p>
                        <p>
                          Documents: {selectedCase.documents?.length || 0}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-none">
                <CardContent className="p-5">
                  <SectionHeader
                    icon={TimerReset}
                    title={`2. ${t(language, "startDebate")}`}
                    description="Open a timed adversarial session for the selected matter."
                  />

                  <div className="mt-4 grid gap-3">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Debate title"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value || 8))}
                      placeholder="Duration in minutes"
                    />
                    <Button
                      onClick={startSession}
                      disabled={loading || !selectedCase}
                      className="w-full"
                    >
                      {loading ? "Starting..." : t(language, "startDebate")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-none">
                <CardContent className="p-5">
                  <SectionHeader
                    icon={FileText}
                    title="Case record snapshot"
                    description="This is what the AI will argue from."
                  />

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Recent documents
                      </p>
                      <div className="mt-2 space-y-2">
                        {(selectedCase?.documents || []).slice(0, 4).map((doc: any) => (
                          <div
                            key={doc.id}
                            className="rounded-xl border border-border/70 p-3"
                          >
                            <p className="text-sm font-medium">{doc.fileName}</p>
                            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                              {doc.aiSummary || "No summary available yet."}
                            </p>
                          </div>
                        ))}

                        {!selectedCase?.documents?.length ? (
                          <p className="text-sm text-muted-foreground">
                            No documents available.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Timeline cues
                      </p>
                      <div className="mt-2 space-y-2">
                        {(selectedCase?.timelineEvents || []).slice(0, 5).map((event: any) => (
                          <div
                            key={event.id}
                            className="rounded-xl border border-border/70 p-3"
                          >
                            <p className="text-sm font-medium">
                              {event.title || event.label || "Timeline event"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {event.eventDate
                                ? formatDate(event.eventDate, "dd MMM yyyy")
                                : "No date"}
                            </p>
                          </div>
                        ))}

                        {!selectedCase?.timelineEvents?.length ? (
                          <p className="text-sm text-muted-foreground">
                            No timeline events available.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/70">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Live debate chamber</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        AI argues as opposing counsel from the current case record.
                      </p>
                    </div>

                    {activeSession ? (
                      <Badge
                        variant={
                          activeSession.status === "ACTIVE" ? "warning" : "secondary"
                        }
                      >
                        {activeSession.status}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No session</Badge>
                    )}
                  </div>

                  {!activeSession || activeSession.caseId !== selectedCase?.id ? (
                    <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-border mt-5">
                      <div className="max-w-md text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-medium">Ready when you are</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Select a case and start a session. The debate will expand
                          here across the full workspace instead of staying inside a
                          small module.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-5">
                      <div className="grid gap-4 md:grid-cols-3">
                        <DebateStat
                          label="Session"
                          value={activeSession.title || "Untitled"}
                        />
                        <DebateStat
                          label="Ends at"
                          value={formatDate(activeSession.endsAt, "dd MMM yyyy, p")}
                        />
                        <DebateStat
                          label="Rounds"
                          value={activeSession.turns?.length || 0}
                        />
                      </div>

                      <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
                        {activeSession.turns.map((turn: any) => (
                          <div
                            key={turn.id}
                            className={cn(
                              "rounded-2xl border p-5",
                              turn.speaker === "AI"
                                ? "border-amber-400/20 bg-amber-500/5"
                                : "border-border/70 bg-background"
                            )}
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    turn.speaker === "AI" ? "warning" : "secondary"
                                  }
                                >
                                  {turn.speaker}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Round {turn.roundNumber}
                                </span>
                              </div>
                            </div>

                            <FormattedAiContent content={turn.content} />
                            <AiTranslationActions text={turn.content} />
                          </div>
                        ))}
                      </div>

                      {activeSession.status === "ACTIVE" ? (
                        <>
                          <Textarea
                            value={argument}
                            onChange={(e) => setArgument(e.target.value)}
                            placeholder="State your argument as counsel for your side."
                            className="min-h-[160px]"
                          />

                          <div className="flex flex-wrap gap-3">
                            <Button
                              onClick={sendTurn}
                              disabled={loading || !argument.trim()}
                            >
                              {loading ? "Submitting…" : "Submit argument"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={finalize}
                              disabled={loading}
                            >
                              {t(language, "endAndScore")}
                            </Button>
                          </div>
                        </>
                      ) : null}

                      {activeSession.status === "COMPLETED" ? (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">
                              {activeSession.outcomeLabel || "Debate scored"}
                            </p>
                            {typeof activeSession.outcomeProbability === "number" ? (
                              <Badge variant="success">
                                {Math.round(activeSession.outcomeProbability * 100)}%
                              </Badge>
                            ) : null}
                          </div>

                          {activeSession.evaluation ? (
                            <div className="mt-4">
                              <FormattedAiContent content={activeSession.evaluation} />
                              <AiTranslationActions text={activeSession.evaluation} />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description
}: {
  icon: any;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-2xl border border-border/70 bg-muted/30 p-2.5">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function DebateStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium leading-6">{value}</p>
    </div>
  );
}
