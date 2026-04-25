"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Briefcase,
  CalendarClock,
  FileText,
  FolderKanban,
  Loader2,
  MessageSquare,
  Plus,
  Scale,
  Send,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { AiTranslationActions } from "@/components/ai-translation-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { toTitleCase, cn } from "@/lib/utils";
import { FormattedAiContent } from "@/utils/ai-content";

type AssistantMessage = {
  id: string;
  role: "USER" | "AI" | "SYSTEM" | string;
  content: string;
  confidence?: number | null;
  sources?: string[];
};

type AssistantThread = {
  id: string;
  title?: string | null;
  caseId?: string | null;
  documentId?: string | null;
  scope?: string;
  messages: AssistantMessage[];
};

type CaseOption = {
  id: string;
  title: string;
  category: string;
  status: string;
  stage: string;
  documentCount: number;
  evidenceCount: number;
  deadlineCount: number;
  recentDocuments: string[];
};

type Mode = "general" | "case";

const GENERAL_PROMPTS = [
  "What rights do I generally have before signing a contract in Pakistan?",
  "What should I do if someone sends me a legal notice?",
  "What evidence should I collect before talking to a lawyer?",
  "How can I respond if a seller refuses a refund?"
];

const CASE_PROMPTS = [
  "What is this case about?",
  "What evidence is missing from this case?",
  "What should I do next?",
  "What are the biggest risks in this case?"
];

export function ClientAiAssistant({
  cases,
  initialThreads
}: {
  cases: CaseOption[];
  initialThreads: AssistantThread[];
}) {
  const language = useLanguage();
  const [mode, setMode] = useState<Mode>("general");
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || "");
  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreads.find((thread) => !thread.caseId && !thread.documentId)?.id || null
  );
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedCaseId) || cases[0],
    [cases, selectedCaseId]
  );

  const contextCaseId = mode === "case" ? selectedCase?.id || "" : "";

  const contextThreads = useMemo(
    () =>
      threads.filter((thread) =>
        mode === "general"
          ? !thread.caseId && !thread.documentId
          : thread.caseId === contextCaseId && !thread.documentId
      ),
    [contextCaseId, mode, threads]
  );

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [activeThreadId, threads]
  );

  const messages = activeThread?.messages || [];
  const quickPrompts = mode === "general" ? GENERAL_PROMPTS : CASE_PROMPTS;
  const canAsk = !loading && question.trim().length > 1 && (mode === "general" || Boolean(contextCaseId));

  useEffect(() => {
    if (!activeThreadId) return;

    const stillValid =
      activeThread &&
      (mode === "general"
        ? !activeThread.caseId && !activeThread.documentId
        : activeThread.caseId === contextCaseId && !activeThread.documentId);

    if (!stillValid) {
      setActiveThreadId(contextThreads[0]?.id || null);
    }
  }, [activeThread, activeThreadId, contextCaseId, contextThreads, mode]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, loading]);

  async function ask(nextQuestion?: string) {
    const text = (nextQuestion || question).trim();
    if (!text || loading) return;

    if (mode === "case" && !contextCaseId) {
      setError("Select a case before starting case mode.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThread?.id,
          caseId: mode === "case" ? contextCaseId : undefined,
          question: text,
          language
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "The AI assistant could not answer right now.");
        return;
      }

      const updatedThread = normalizeThread(data.thread);
      setThreads((current) => [
        updatedThread,
        ...current.filter((thread) => thread.id !== updatedThread.id)
      ]);
      setActiveThreadId(updatedThread.id);
      setQuestion("");
    } catch {
      setError("The AI assistant could not answer right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function startNewConversation() {
    setActiveThreadId(null);
    setQuestion("");
    setError(null);
  }

  return (
    <div className="space-y-6 fade-in-up">
      <section className="surface-card overflow-hidden rounded-[2rem]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-6 lg:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <Bot className="mr-1 h-3.5 w-3.5" />
                Client AI desk
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                <Scale className="mr-1 h-3.5 w-3.5" />
                Pakistani-law context
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                <Briefcase className="mr-1 h-3.5 w-3.5" />
                Lawyer directory aware
              </Badge>
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
              Ask clear legal questions, then switch into a case-aware discussion.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              General mode answers without case data. Case mode attaches the selected matter, documents, evidence, deadlines, drafts, and timeline context.
            </p>
          </div>

          <div className="border-t border-border/70 bg-muted/20 p-6 lg:border-l lg:border-t-0">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <AssistantStat icon={MessageSquare} label="Mode" value={mode === "general" ? "General" : "Case"} />
              <AssistantStat icon={FolderKanban} label="Cases" value={cases.length} />
              <AssistantStat icon={ShieldCheck} label="Threads" value={threads.length} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-sm xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-b border-border/70 bg-muted/15 p-5 xl:border-b-0 xl:border-r">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Conversation mode
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ModeButton
                  active={mode === "general"}
                  icon={Sparkles}
                  label="General"
                  onClick={() => setMode("general")}
                />
                <ModeButton
                  active={mode === "case"}
                  icon={Briefcase}
                  label="Case"
                  onClick={() => setMode("case")}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Case selection
                </p>
                <Badge variant={mode === "case" ? "success" : "outline"} className="rounded-full px-3 py-1">
                  {mode === "case" ? "Attached" : "Off"}
                </Badge>
              </div>

              <select
                value={selectedCase?.id || ""}
                disabled={mode !== "case" || !cases.length}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cases.length ? (
                  cases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))
                ) : (
                  <option>No cases yet</option>
                )}
              </select>
            </div>

            <CaseSnapshot mode={mode} selectedCase={selectedCase} />

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Conversation
                </p>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title="New chat"
                  onClick={startNewConversation}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <select
                value={activeThreadId || "new"}
                onChange={(event) => setActiveThreadId(event.target.value === "new" ? null : event.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="new">New conversation</option>
                {contextThreads.map((thread) => (
                  <option key={thread.id} value={thread.id}>
                    {thread.title || "Untitled conversation"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Quick prompts
              </p>
              <div className="mt-3 space-y-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={loading || (mode === "case" && !contextCaseId)}
                    onClick={() => ask(prompt)}
                  className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-left text-sm leading-6 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-h-[680px] flex-col">
          <div className="flex flex-col gap-4 border-b border-border/70 bg-background/60 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {mode === "general" ? <Bot className="h-5 w-5" /> : <FolderKanban className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {mode === "general" ? "General legal assistant" : selectedCase?.title || "Case assistant"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mode === "general"
                    ? "No case file attached"
                    : `${toTitleCase(selectedCase?.category || "OTHER")} - ${selectedCase?.stage || "Workspace"}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={mode === "general" ? "secondary" : "success"} className="rounded-full px-3 py-1">
                {mode === "general" ? "General mode" : "Case mode"}
              </Badge>
              {activeThread ? (
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {activeThread.messages.length} messages
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  New conversation
                </Badge>
              )}
            </div>
          </div>

          {error ? (
            <div className="mx-5 mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="premium-scroll flex-1 overflow-y-auto p-5">
            {messages.length ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {loading ? <ThinkingBubble /> : null}
                <div ref={scrollRef} />
              </div>
            ) : (
              <EmptyConversation mode={mode} selectedCase={selectedCase} />
            )}
          </div>

          <div className="border-t border-border/70 bg-muted/15 p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    ask();
                  }
                }}
                placeholder={
                  mode === "general"
                    ? "Ask about rights, notices, refunds, contracts, complaints..."
                    : "Ask about the selected case, evidence, risks, next steps..."
                }
                className="min-h-[96px] resize-none bg-background"
              />
              <Button
                type="button"
                size="lg"
                disabled={!canAsk}
                onClick={() => ask()}
                className="h-12 min-w-[130px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: typeof Bot;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function AssistantStat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Bot;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function CaseSnapshot({
  mode,
  selectedCase
}: {
  mode: Mode;
  selectedCase?: CaseOption;
}) {
  if (mode === "general") {
    return (
      <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">General rights mode</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Case files stay detached in this mode.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCase) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Create a case to unlock case mode.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4">
      <div>
        <p className="text-sm font-semibold">{selectedCase.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {toTitleCase(selectedCase.category)} - {toTitleCase(selectedCase.status)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniMetric icon={FileText} label="Docs" value={selectedCase.documentCount} />
        <MiniMetric icon={ShieldCheck} label="Evidence" value={selectedCase.evidenceCount} />
        <MiniMetric icon={CalendarClock} label="Dates" value={selectedCase.deadlineCount} />
      </div>

      {selectedCase.recentDocuments.length ? (
        <div className="space-y-2">
          {selectedCase.recentDocuments.slice(0, 3).map((document) => (
            <div
              key={document}
              className="truncate rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
              title={document}
            >
              {document}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Bot;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background px-2 py-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1 text-base font-semibold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isAi = message.role === "AI";
  const sources = Array.isArray(message.sources) ? message.sources : [];

  return (
    <div className={cn("flex", isAi ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[92%] overflow-visible rounded-[1.5rem] border p-4 break-words md:max-w-[82%]",
          isAi
            ? "border-primary/20 bg-primary/5"
            : "border-primary bg-primary text-primary-foreground shadow-soft"
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <Badge variant={isAi ? "secondary" : "outline"} className={cn("rounded-full px-3 py-1", !isAi && "border-primary-foreground/30 text-primary-foreground")}>
            {isAi ? "AI" : "You"}
          </Badge>
          {isAi && typeof message.confidence === "number" ? (
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {Math.round(message.confidence * 100)}%
            </Badge>
          ) : null}
        </div>

        {isAi ? (
          <div className="max-w-none overflow-visible">
            <FormattedAiContent content={message.content} />
            <div className="mt-3">
              <AiTranslationActions text={message.content} />
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        )}

        {isAi && sources.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {sources.map((source) => (
              <Badge key={source} variant="outline" className="rounded-full px-3 py-1">
                {source}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-3 rounded-[1.5rem] border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Thinking...
      </div>
    </div>
  );
}

function EmptyConversation({
  mode,
  selectedCase
}: {
  mode: Mode;
  selectedCase?: CaseOption;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/30 text-primary">
          {mode === "general" ? <Bot className="h-7 w-7" /> : <Scale className="h-7 w-7" />}
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">
          {mode === "general" ? "Start with a legal question" : selectedCase?.title || "Select a case"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {mode === "general"
            ? "The assistant will answer from general Pakistani-law starter context."
            : "The assistant will include the selected matter record in its analysis."}
        </p>
      </div>
    </div>
  );
}

function normalizeThread(raw: any): AssistantThread {
  return {
    id: String(raw.id),
    title: raw.title || null,
    caseId: raw.caseId || null,
    documentId: raw.documentId || null,
    scope: raw.scope || "GENERAL",
    messages: Array.isArray(raw.messages)
      ? raw.messages.map((message: any) => ({
          id: String(message.id),
          role: message.role,
          content: String(message.content || ""),
          confidence: typeof message.confidence === "number" ? message.confidence : null,
          sources: Array.isArray(message.sources)
            ? message.sources.filter((source: unknown): source is string => typeof source === "string")
            : []
        }))
      : []
  };
}
