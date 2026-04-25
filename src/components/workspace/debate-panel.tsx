"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AiTranslationActions } from "@/components/ai-translation-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { formatDate } from "@/lib/utils";
import { FormattedAiContent } from "@/utils/ai-content";

export function DebatePanel({ caseId, sessions }: { caseId: string; sessions: any[] }) {
  const router = useRouter();
  const language = useLanguage();
  const [title, setTitle] = useState("Opposition simulation");
  const [duration, setDuration] = useState(6);
  const [argument, setArgument] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const active = useMemo(
    () => sessions.find((item) => item.status === "ACTIVE") || sessions[0],
    [sessions]
  );

  async function startSession() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/debate/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, title, durationMinutes: duration, language })
      });
      await requireOk(res, "Unable to start debate.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start debate.");
    } finally {
      setLoading(false);
    }
  }

  async function sendTurn() {
    if (!active || !argument.trim()) return;

    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/debate/session/${active.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: argument, language })
      });
      await requireOk(res, "Unable to submit argument.");
      setArgument("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit argument.");
    } finally {
      setLoading(false);
    }
  }

  async function finalize() {
    if (!active) return;

    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/debate/session/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language })
      });
      await requireOk(res, "Unable to finalize debate.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to finalize debate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t(language, "debateMode")}</p>
            <p className="text-xs text-muted-foreground">
              AI acts as opposing counsel, argues from the current record, then scores who is ahead when time ends.
            </p>
          </div>
          {active ? (
            <Badge variant={active.status === "ACTIVE" ? "warning" : "secondary"}>
              {active.status}
            </Badge>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!active || active.status !== "ACTIVE" ? (
          <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
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
              onChange={(e) => setDuration(Number(e.target.value || 6))}
            />
            <Button onClick={startSession} disabled={loading}>
              {loading ? "Starting..." : t(language, "startDebate")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              Ends at {formatDate(active.endsAt, "dd MMM yyyy, p")}
            </div>

            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {active.turns.map((turn: any) => (
                <div
                  key={turn.id}
                  className={`rounded-2xl border p-4 ${
                    turn.speaker === "AI"
                      ? "border-amber-400/20 bg-amber-500/5"
                      : "border-border/70 bg-background"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Badge variant={turn.speaker === "AI" ? "warning" : "secondary"}>
                      {turn.speaker}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Round {turn.roundNumber}
                    </span>
                  </div>

                  <div className="text-sm">
                    <FormattedAiContent content={turn.content} />
                    <AiTranslationActions text={turn.content} />
                  </div>
                </div>
              ))}
            </div>

            <Textarea
              value={argument}
              onChange={(e) => setArgument(e.target.value)}
              placeholder="State your argument as counsel for your side."
            />

            <div className="flex gap-3">
              <Button onClick={sendTurn} disabled={loading || !argument.trim()}>
                {loading ? "Submitting..." : "Submit argument"}
              </Button>
              <Button variant="outline" onClick={finalize} disabled={loading}>
                {t(language, "endAndScore")}
              </Button>
            </div>
          </div>
        )}

        {active?.status === "COMPLETED" ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{active.outcomeLabel || "Debate scored"}</p>
              {typeof active.outcomeProbability === "number" ? (
                <Badge variant="success">
                  {Math.round(active.outcomeProbability * 100)}%
                </Badge>
              ) : null}
            </div>

            {active.evaluation ? (
              <div className="mt-3 text-sm">
                <FormattedAiContent content={active.evaluation} />
                <AiTranslationActions text={active.evaluation} />
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

async function requireOk(response: Response, fallback: string) {
  if (response.ok) return;
  const data = await response.json().catch(() => null);
  throw new Error(data?.error || fallback);
}
