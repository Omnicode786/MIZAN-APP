"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AiTranslationActions } from "@/components/ai-translation-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { FormattedAiContent } from "@/utils/ai-content";

type Message = {
  id: string;
  role: string;
  content: string;
  confidence?: number;
  sources?: string[];
};

type Thread = {
  id: string;
  title?: string;
  messages?: Message[];
};

export function AssistantPanel({
  caseId,
  documentId,
  threads,
  role,
  simpleLanguageMode
}: {
  caseId?: string;
  documentId?: string;
  threads: Thread[];
  role: string;
  simpleLanguageMode?: boolean;
}) {
  const router = useRouter();
  const language = useLanguage();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(threads[0]?.id || null);

  const activeThread = useMemo(
    () => threads.find((item) => item.id === activeThreadId) || threads[0],
    [threads, activeThreadId]
  );

  async function ask() {
    if (!question.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThread?.id,
          caseId,
          documentId,
          question,
          title: question.slice(0, 80),
          language
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        setQuestion("");
        setActiveThreadId(data.thread.id);
        router.refresh();
      } else {
        setError(data?.error || "The AI assistant could not answer right now.");
      }
    } catch {
      setError("The AI assistant could not answer right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t(language, "aiLegalAssistance")}</p>
            <p className="text-xs text-muted-foreground">
              Grounded in Pakistani-law starter data and the current case file.
              {role === "CLIENT" && simpleLanguageMode ? " Plain-language mode is on." : ""}
            </p>
          </div>

          {threads.length ? (
            <select
              value={activeThread?.id}
              onChange={(e) => setActiveThreadId(e.target.value)}
              className="h-9 rounded-2xl border border-border bg-background px-3 text-xs"
            >
              {threads.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {thread.title || "Untitled thread"}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {(activeThread?.messages || []).map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl border p-4 transition-colors duration-200 ${
                message.role === "AI"
                  ? "border-primary/20 bg-primary/5"
                  : "border-border/70 bg-background"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {message.role}
                </p>

                {message.confidence ? (
                  <Badge variant="secondary">
                    {Math.round(message.confidence * 100)}%
                  </Badge>
                ) : null}
              </div>

              <div className="mt-3">
                {message.role === "AI" ? (
                  <>
                    <FormattedAiContent content={message.content} />
                    <AiTranslationActions text={message.content} />
                  </>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {message.content}
                  </p>
                )}
              </div>

              {Array.isArray(message.sources) && message.sources.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.sources.map((source) => (
                    <Badge key={source} variant="outline">
                      {source}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {!activeThread?.messages?.length ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Ask about your uploaded document, your case status, rights, risks,
              evidence gaps, or what to do next.
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex gap-3">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t(language, "askQuestion")}
          />
          <Button onClick={ask} disabled={loading || !question.trim()}>
            {loading ? "Thinking..." : t(language, "askQuestion")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
