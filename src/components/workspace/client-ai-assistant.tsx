"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bot,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderKanban,
  Loader2,
  MessageSquare,
  Plus,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  XCircle
} from "lucide-react";
import { AiTranslationActions } from "@/components/ai-translation-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FrostedSurface as GlassSurface } from "@/components/ui/frosted-surface";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import {
  extractAssistantActionMeta,
  extractAssistantAgentProposalMeta,
  extractAssistantCasePreviewMeta,
  stripAssistantActionMeta
} from "@/lib/assistant-message-meta";
import { toTitleCase, cn } from "@/lib/utils";
import { FormattedAiContent } from "@/utils/ai-content";

type AssistantMessage = {
  id: string;
  role: "USER" | "AI" | "SYSTEM" | string;
  content: string;
  confidence?: number | null;
  sources?: string[];
  sequence?: number | null;
  createdAt?: string | Date | null;
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
type ChatPhase = "idle" | "launchingUserMessage" | "waitingForAI" | "typingAI";
type ChatRequestContext = { threadId: string | null; caseId?: string };

type FlyingBubbleState = {
  id: string;
  text: string;
  request: ChatRequestContext;
  from: { left: number; top: number; width: number };
  to: { left: number; top: number };
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const GENERAL_PROMPTS = [
  "Create a case from my story.",
  "Find missing evidence for my dispute.",
  "Make me a legal notice draft.",
  "Build my next-step roadmap."
];

const CASE_PROMPTS = [
  "Add a deadline to this case.",
  "Run evidence intake on this case.",
  "Generate a case health score.",
  "Prepare hearing or meeting prep.",
  "Prepare a lawyer handoff for this case.",
  "Summarize this case for me.",
  "Generate next steps for this case."
];

export function ClientAiAssistant({
  cases,
  initialThreads
}: {
  cases: CaseOption[];
  initialThreads: AssistantThread[];
}) {
  const router = useRouter();
  const language = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("general");
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || "");
  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreads.find((thread) => !thread.caseId && !thread.documentId)?.id || null
  );
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [flyingBubble, setFlyingBubble] = useState<FlyingBubbleState | null>(null);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<AssistantMessage | null>(null);
  const [pendingThread, setPendingThread] = useState<AssistantThread | null>(null);
  const [typingMessage, setTypingMessage] = useState<AssistantMessage | null>(null);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingAnchorRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const autoScrollRef = useRef(true);
  const submitLockRef = useRef(false);
  const activeRequestIdRef = useRef(0);
  const completedLaunchIdRef = useRef<string | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedCaseId) || cases[0],
    [cases, selectedCaseId]
  );
  const knownCaseIds = useMemo(() => new Set(cases.map((item) => item.id)), [cases]);

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

  const messages = useMemo(
    () => sortAssistantMessages(activeThread?.messages || []),
    [activeThread?.messages]
  );
  const isChatBusy = phase !== "idle";
  const displayedMessages = useMemo(() => {
    let visibleMessages = pendingThread
      ? sortAssistantMessages(
          pendingThread.messages.filter((message) => message.id !== typingMessage?.id)
        )
      : messages;

    if (optimisticUserMessage && !pendingThread) {
      visibleMessages = sortAssistantMessages([...visibleMessages, optimisticUserMessage]);
    }

    if (typingMessage) {
      visibleMessages = sortAssistantMessages([...visibleMessages, typingMessage]);
    }

    return visibleMessages;
  }, [messages, optimisticUserMessage, pendingThread, typingMessage]);
  const quickPrompts = mode === "general" ? GENERAL_PROMPTS : CASE_PROMPTS;
  const canAsk = !isChatBusy && question.trim().length > 1 && (mode === "general" || Boolean(contextCaseId));

  const scheduleScrollToBottom = useCallback((force = false) => {
    if (!force && !autoScrollRef.current) return;
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const viewport = chatViewportRef.current;
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: force && !prefersReducedMotion ? "smooth" : "auto"
        });
      } else {
        scrollRef.current?.scrollIntoView({
          block: "end",
          behavior: force && !prefersReducedMotion ? "smooth" : "auto"
        });
      }
      scrollFrameRef.current = null;
    });
  }, [prefersReducedMotion]);

  const scheduleScrollToActiveResponse = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const viewport = chatViewportRef.current;
      const anchor = typingAnchorRef.current;

      if (!viewport || !anchor) {
        scheduleScrollToBottom(true);
        return;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const overflow = anchorRect.bottom - viewportRect.bottom + 28;
      const above = anchorRect.top - viewportRect.top - 28;
      const delta = overflow > 0 ? overflow : above < 0 ? above : 0;

      if (delta !== 0) {
        viewport.scrollTo({
          top: Math.max(0, viewport.scrollTop + delta),
          behavior: "auto"
        });
      }

      autoScrollRef.current = true;
      scrollFrameRef.current = null;
    });
  }, [scheduleScrollToBottom]);

  const handleChatScroll = useCallback(() => {
    if (phase === "typingAI") {
      autoScrollRef.current = true;
      return;
    }

    const node = chatViewportRef.current;
    if (!node) return;

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    autoScrollRef.current = distanceFromBottom < 96;
  }, [phase]);

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
    scheduleScrollToBottom(phase === "launchingUserMessage" || phase === "waitingForAI");
  }, [displayedMessages.length, phase, scheduleScrollToBottom]);

  useEffect(() => {
    if (typingMessage) scheduleScrollToActiveResponse();
  }, [scheduleScrollToActiveResponse, typingMessage?.content]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  function createFlyingBubble(text: string, request: ChatRequestContext): FlyingBubbleState {
    const sourceRect = composerRef.current?.getBoundingClientRect();
    const viewportRect = chatViewportRef.current?.getBoundingClientRect();
    const safeLeft = (viewportRect?.left ?? 16) + 16;
    const safeRight = (viewportRect?.right ?? window.innerWidth - 16) - 16;
    const safeTop = (viewportRect?.top ?? 80) + 16;
    const safeBottom = (viewportRect?.bottom ?? window.innerHeight - 120) - 16;
    const containerWidth = Math.max(220, safeRight - safeLeft);
    const width = Math.min(containerWidth, Math.max(220, Math.min(containerWidth * 0.82, 560)));
    const minLeft = safeLeft;
    const maxLeft = Math.max(minLeft, safeRight - width);
    const fromLeft = clampNumber(sourceRect ? sourceRect.right - width : maxLeft, minLeft, maxLeft);
    const fromTop = clampNumber(sourceRect ? sourceRect.top : safeBottom - 76, safeTop, Math.max(safeTop, safeBottom - 76));
    const toLeft = clampNumber(safeRight - width, minLeft, maxLeft);
    const toTop = clampNumber(safeBottom - 76, safeTop, Math.max(safeTop, safeBottom - 76));

    return {
      id: `flying-${Date.now()}`,
      text,
      request,
      from: { left: fromLeft, top: fromTop, width },
      to: { left: toLeft, top: toTop }
    };
  }

  function commitOptimisticUserMessage(text: string) {
    const nextSequence =
      displayedMessages.reduce(
        (max, message) => Math.max(max, typeof message.sequence === "number" ? message.sequence : -1),
        -1
      ) + 1;

    const message = {
      id: `optimistic-user-${Date.now()}`,
      role: "USER",
      content: text,
      sequence: nextSequence,
      createdAt: new Date().toISOString(),
      sources: []
    } satisfies AssistantMessage;

    setOptimisticUserMessage(message);
    scheduleScrollToBottom(true);
  }

  function finishAiTyping(finalThread: AssistantThread, latestAiMessage: AssistantMessage | null) {
    setThreads((current) => [
      finalThread,
      ...current.filter((thread) => thread.id !== finalThread.id)
    ]);
    setActiveThreadId(finalThread.id);
    setError(null);
    setPendingThread(null);
    setTypingMessage(null);
    setOptimisticUserMessage(null);
    setPhase("idle");
    submitLockRef.current = false;
    scheduleScrollToBottom(true);

    const latestAction = latestAiMessage ? extractAssistantActionMeta(latestAiMessage.content) : null;
    if (latestAction?.status === "success") {
      router.refresh();
    }
  }

  function startAiTyping(finalThread: AssistantThread) {
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const sortedMessages = sortAssistantMessages(finalThread.messages);
    const latestAiMessage = [...sortedMessages].reverse().find((message) => message.role === "AI") || null;

    if (!latestAiMessage) {
      finishAiTyping(finalThread, null);
      return;
    }

    setPendingThread(finalThread);
    setTypingMessage({ ...latestAiMessage, content: "" });
    setPhase("typingAI");
    autoScrollRef.current = true;
    scheduleScrollToActiveResponse();

    const fullText = latestAiMessage.content || "";
    if (prefersReducedMotion || !fullText) {
      setTypingMessage(latestAiMessage);
      finishAiTyping(finalThread, latestAiMessage);
      return;
    }

    let index = 0;
    const chunkSize = Math.max(3, Math.ceil(fullText.length / 120));

    const tick = () => {
      index = Math.min(fullText.length, index + chunkSize);
      setTypingMessage({ ...latestAiMessage, content: fullText.slice(0, index) });
      scheduleScrollToActiveResponse();

      if (index < fullText.length) {
        typingTimerRef.current = window.setTimeout(tick, 24);
        return;
      }

      typingTimerRef.current = window.setTimeout(() => {
        finishAiTyping(finalThread, latestAiMessage);
      }, 180);
    };

    typingTimerRef.current = window.setTimeout(tick, 90);
  }

  async function requestAiResponse(text: string, request: ChatRequestContext) {
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    setPhase("waitingForAI");
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(request.threadId ? { threadId: request.threadId } : {}),
          ...(request.caseId ? { caseId: request.caseId } : {}),
          question: text,
          language,
          agentMode: true
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (activeRequestIdRef.current !== requestId) return;
        setError(data?.error || "The AI assistant could not answer right now.");
        setQuestion(text);
        setOptimisticUserMessage(null);
        setPendingThread(null);
        setTypingMessage(null);
        setPhase("idle");
        submitLockRef.current = false;
        return;
      }

      if (!data?.thread) {
        if (activeRequestIdRef.current !== requestId) return;
        setError("The AI assistant answered, but the conversation could not be loaded.");
        setQuestion(text);
        setOptimisticUserMessage(null);
        setPendingThread(null);
        setTypingMessage(null);
        setPhase("idle");
        submitLockRef.current = false;
        return;
      }

      if (activeRequestIdRef.current !== requestId) return;
      startAiTyping(normalizeThread(data.thread));
    } catch {
      if (activeRequestIdRef.current !== requestId) return;
      setError("The AI assistant could not answer right now. Please try again.");
      setQuestion(text);
      setOptimisticUserMessage(null);
      setPendingThread(null);
      setTypingMessage(null);
      setPhase("idle");
      submitLockRef.current = false;
    }
  }

  function completeUserLaunch(launchId: string, text: string, request: ChatRequestContext) {
    if (completedLaunchIdRef.current === launchId) return;
    completedLaunchIdRef.current = launchId;
    setFlyingBubble(null);
    commitOptimisticUserMessage(text);
    void requestAiResponse(text, request);
  }

  async function ask(nextQuestion?: string) {
    const text = (nextQuestion || question).trim();
    if (!text || isChatBusy || submitLockRef.current) return;

    if (mode === "case" && !contextCaseId) {
      setError("Select a case before starting case mode.");
      return;
    }

    submitLockRef.current = true;
    completedLaunchIdRef.current = null;
    const requestContext: ChatRequestContext = {
      threadId: activeThread?.id || null,
      caseId: mode === "case" ? contextCaseId : undefined
    };
    setError(null);
    setQuestion("");
    autoScrollRef.current = true;
    scheduleScrollToBottom(true);

    if (prefersReducedMotion) {
      setPhase("waitingForAI");
      commitOptimisticUserMessage(text);
      void requestAiResponse(text, requestContext);
      return;
    }

    setPhase("launchingUserMessage");
    setFlyingBubble(createFlyingBubble(text, requestContext));
  }

  function startNewConversation() {
    if (isChatBusy) return;
    setActiveThreadId(null);
    setQuestion("");
    setError(null);
  }

  return (
    <div className="space-y-6 fade-in-up">
      <GlassSurface
        className="overflow-hidden"
        borderRadius={34}
        borderGlow
        backgroundOpacity={0.16}
        blur={15}
        saturation={1.42}
        innerClassName="overflow-hidden rounded-[inherit]"
      >
        <section className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-6 lg:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <Bot className="mr-1 h-3.5 w-3.5" />
                Client AI desk
              </Badge>
              <Badge variant="success" className="rounded-full px-3 py-1">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Agent mode enabled
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
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              The assistant can create cases, add deadlines, generate drafts, and build roadmap steps when you explicitly ask it to act.
            </p>
          </div>

          <div className="border-t border-white/15 bg-white/10 p-6 lg:border-l lg:border-t-0 dark:bg-white/5">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <AssistantStat icon={MessageSquare} label="Mode" value={mode === "general" ? "General" : "Case"} />
              <AssistantStat icon={FolderKanban} label="Cases" value={cases.length} />
              <AssistantStat icon={ShieldCheck} label="Threads" value={threads.length} />
            </div>
          </div>
        </section>
      </GlassSurface>

      <GlassSurface
        className="overflow-hidden"
        borderRadius={34}
        borderGlow
        backgroundOpacity={0.12}
        blur={14}
        saturation={1.36}
        innerClassName="grid overflow-hidden rounded-[inherit] xl:grid-cols-[360px_minmax(0,1fr)]"
      >
        <aside className="border-b border-white/15 bg-white/10 p-5 dark:bg-white/5 xl:border-b-0 xl:border-r">
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
                  disabled={isChatBusy}
                  onClick={() => setMode("general")}
                />
                <ModeButton
                  active={mode === "case"}
                  icon={Briefcase}
                  label="Case"
                  disabled={isChatBusy}
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
                disabled={isChatBusy || mode !== "case" || !cases.length}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                className="glass-chip h-11 w-full rounded-2xl bg-background px-4 text-sm text-foreground outline-none transition [color-scheme:light] focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#05070d] dark:text-slate-100 dark:[color-scheme:dark]"
              >
                {cases.length ? (
                  cases.map((item) => (
                    <option key={item.id} value={item.id} className="bg-background text-foreground dark:bg-[#05070d] dark:text-slate-100">
                      {item.title}
                    </option>
                  ))
                ) : (
                  <option className="bg-background text-foreground dark:bg-[#05070d] dark:text-slate-100">No cases yet</option>
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
                  disabled={isChatBusy}
                  onClick={startNewConversation}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <select
                value={activeThreadId || "new"}
                disabled={isChatBusy}
                onChange={(event) => setActiveThreadId(event.target.value === "new" ? null : event.target.value)}
                className="glass-chip h-11 w-full rounded-2xl bg-background px-4 text-sm text-foreground outline-none transition [color-scheme:light] focus-visible:ring-2 focus-visible:ring-ring dark:bg-[#05070d] dark:text-slate-100 dark:[color-scheme:dark]"
              >
                <option value="new" className="bg-background text-foreground dark:bg-[#05070d] dark:text-slate-100">
                  New conversation
                </option>
                {contextThreads.map((thread) => (
                  <option key={thread.id} value={thread.id} className="bg-background text-foreground dark:bg-[#05070d] dark:text-slate-100">
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
                    disabled={isChatBusy || (mode === "case" && !contextCaseId)}
                    onClick={() => ask(prompt)}
                    className="glass-subtle w-full rounded-2xl px-4 py-3 text-left text-sm leading-6 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-h-[680px] flex-col">
          <div className="flex flex-col gap-4 border-b border-white/15 bg-white/10 p-5 dark:bg-white/5 md:flex-row md:items-center md:justify-between">
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
                  {displayedMessages.length} messages
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

          <div
            ref={chatViewportRef}
            onScroll={handleChatScroll}
            className="premium-scroll flex-1 overflow-y-auto p-5"
          >
            {displayedMessages.length ? (
              <div className="space-y-4">
                {displayedMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    disabled={isChatBusy}
                    knownCaseIds={knownCaseIds}
                    onSend={ask}
                    isTyping={typingMessage?.id === message.id && phase === "typingAI"}
                    typingAnchorRef={typingAnchorRef}
                  />
                ))}
                {phase === "waitingForAI" ? <ThinkingBubble /> : null}
                <div ref={scrollRef} />
              </div>
            ) : (
              <EmptyConversation mode={mode} selectedCase={selectedCase} />
            )}
          </div>

          <div className="border-t border-white/15 bg-white/10 p-5 dark:bg-white/5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Textarea
                ref={composerRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (canAsk) void ask();
                  }
                }}
                disabled={isChatBusy}
                aria-label="AI assistant message"
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
                aria-label="Send message to AI assistant"
                className="h-12 min-w-[130px]"
              >
                {isChatBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {phase === "launchingUserMessage" ? "Sending..." : "Agent is organizing..."}
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
      </GlassSurface>
      <AnimatePresence>
        {flyingBubble ? (
          <motion.div
            key={flyingBubble.id}
            className="pointer-events-none fixed z-[80] rounded-[1.5rem] border border-primary bg-primary p-4 text-sm leading-6 text-primary-foreground shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
            style={{
              left: flyingBubble.from.left,
              top: flyingBubble.from.top,
              width: flyingBubble.from.width,
              transformOrigin: "right bottom"
            }}
            initial={{ opacity: 0.72, scale: 0.96, x: 0, y: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: flyingBubble.to.left - flyingBubble.from.left,
              y: flyingBubble.to.top - flyingBubble.from.top
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => completeUserLaunch(flyingBubble.id, flyingBubble.text, flyingBubble.request)}
          >
            <p className="max-h-28 overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{flyingBubble.text}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  disabled = false,
  onClick
}: {
  active: boolean;
  icon: typeof Bot;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "glass-chip border-white/30 bg-white/40 text-muted-foreground hover:bg-white/50 hover:text-foreground dark:bg-white/5 dark:hover:bg-white/10"
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
    <div className="glass-subtle rounded-2xl p-4">
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
      <div className="glass-subtle rounded-2xl p-4">
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
      <div className="glass-subtle rounded-2xl border-dashed p-4 text-sm text-muted-foreground">
        Create a case to unlock case mode.
      </div>
    );
  }

  return (
      <div className="glass-subtle space-y-3 rounded-2xl p-4">
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
    <div className="glass-subtle rounded-xl px-2 py-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1 text-base font-semibold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function MessageBubble({
  message,
  disabled,
  knownCaseIds,
  onSend,
  isTyping = false,
  typingAnchorRef
}: {
  message: AssistantMessage;
  disabled?: boolean;
  knownCaseIds: ReadonlySet<string>;
  onSend: (message: string) => void;
  isTyping?: boolean;
  typingAnchorRef?: MutableRefObject<HTMLDivElement | null>;
}) {
  const isAi = message.role === "AI";
  const sources = Array.isArray(message.sources) ? message.sources : [];
  const actionMeta = isAi ? extractAssistantActionMeta(message.content) : null;
  const proposalMeta = isAi
    ? extractAssistantAgentProposalMeta(message.content) ||
      extractAssistantCasePreviewMeta(message.content)
    : null;
  const displayContent = isAi ? stripAssistantActionMeta(message.content) : message.content;

  return (
    <motion.div
      ref={isTyping ? typingAnchorRef : undefined}
      className={cn("flex", isAi ? "justify-start" : "justify-end")}
      initial={isTyping ? { opacity: 0, y: 14, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={cn(
          "max-w-[92%] overflow-visible rounded-[1.5rem] border p-4 break-words [overflow-wrap:anywhere] md:max-w-[82%]",
          isAi
            ? "glass-subtle border-primary/20 bg-primary/10"
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
            {displayContent.trim() ? (
              <FormattedAiContent content={displayContent} />
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">AI is drafting the response...</p>
            )}
            {isTyping ? (
              <span className="mt-2 inline-block h-4 w-[2px] animate-pulse rounded-full bg-primary align-bottom" />
            ) : null}
            <div className="mt-3">
              <AiTranslationActions text={displayContent} />
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{message.content}</p>
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

        {isAi && actionMeta ? <AgentActionCard meta={actionMeta} knownCaseIds={knownCaseIds} /> : null}
        {isAi && !actionMeta && proposalMeta ? (
          <AgentProposalCard
            meta={proposalMeta}
            disabled={disabled}
            onApprove={() => onSend("Yes, apply this action to my workspace.")}
            onReject={() => onSend("No, cancel this action.")}
          />
        ) : null}
      </div>
    </motion.div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="glass-subtle flex items-center gap-3 rounded-[1.5rem] border-primary/20 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Agent is organizing your matter...
      </div>
    </div>
  );
}

function AgentActionCard({
  meta,
  knownCaseIds
}: {
  meta: ReturnType<typeof extractAssistantActionMeta>;
  knownCaseIds: ReadonlySet<string>;
}) {
  if (!meta) {
    return null;
  }

  const href = meta.action?.href || "";
  const hrefCaseId = getCaseIdFromActionHref(href);
  const caseDeleted =
    meta.action?.type === "case_deleted" ||
    meta.action?.label === "Case deleted" ||
    Boolean(hrefCaseId && !knownCaseIds.has(hrefCaseId));

  return (
    <div className="glass-subtle mt-4 rounded-2xl p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{meta.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{meta.message}</p>
        </div>

        {caseDeleted ? (
          <Button type="button" size="sm" variant="outline" disabled className="w-full sm:w-auto">
            <XCircle className="mr-2 h-4 w-4" />
            Case deleted
          </Button>
        ) : href ? (
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href={href}>{meta.action?.label || "Open result"}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function sortAssistantMessages(messages: AssistantMessage[]) {
  return [...messages].sort((first, second) => {
    const firstSequence = typeof first.sequence === "number" ? first.sequence : Number.MAX_SAFE_INTEGER;
    const secondSequence = typeof second.sequence === "number" ? second.sequence : Number.MAX_SAFE_INTEGER;

    if (firstSequence !== secondSequence) return firstSequence - secondSequence;

    const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;

    if (firstTime !== secondTime) return firstTime - secondTime;
    return first.id.localeCompare(second.id);
  });
}

function getCaseIdFromActionHref(href: string) {
  const match = href.match(/^\/(?:client|lawyer)\/cases\/([^/?#]+)(?:$|[/?#])/);
  return match?.[1] || "";
}

function AgentProposalCard({
  meta,
  disabled,
  onApprove,
  onReject
}: {
  meta:
    | ReturnType<typeof extractAssistantAgentProposalMeta>
    | ReturnType<typeof extractAssistantCasePreviewMeta>;
  disabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (!meta) {
    return null;
  }

  const title =
    "title" in meta && meta.title
      ? meta.title
      : meta.tool === "create_case"
        ? "Create case"
        : "Approve action";
  const message =
    "message" in meta && meta.message
      ? meta.message
      : "This action is waiting for your confirmation before anything is saved.";

  return (
    <div className="glass-subtle mt-4 rounded-2xl p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{message}</p>
          <Badge variant="outline" className="mt-3 rounded-full px-3 py-1">
            Waiting for approval
          </Badge>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            type="button"
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={disabled}
            onClick={onApprove}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={disabled}
            onClick={onReject}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
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
      ? sortAssistantMessages(
          raw.messages.map((message: any) => ({
            id: String(message.id),
            role: message.role,
            content: String(message.content || ""),
            confidence: typeof message.confidence === "number" ? message.confidence : null,
            sequence: typeof message.sequence === "number" ? message.sequence : null,
            createdAt: message.createdAt || null,
            sources: Array.isArray(message.sources)
              ? message.sources.filter((source: unknown): source is string => typeof source === "string")
              : []
          }))
        )
      : []
  };
}
