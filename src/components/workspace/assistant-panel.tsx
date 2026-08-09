"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiTranslationActions } from "@/components/ai-translation-actions";
import { FrostedSurface as GlassSurface } from "@/components/ui/frosted-surface";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { stripAssistantActionMeta } from "@/lib/assistant-message-meta";
import { t } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { FormattedAiContent } from "@/utils/ai-content";

type Message = {
  id: string;
  role: string;
  content: string;
  confidence?: number | null;
  sources?: string[];
  sequence?: number | null;
  createdAt?: string | Date | null;
};

type Thread = {
  id: string;
  title?: string | null;
  messages?: Message[];
};

type ChatPhase = "idle" | "launchingUserMessage" | "waitingForAI" | "typingAI";
type ChatRequestContext = { threadId: string | null };

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
  const prefersReducedMotion = useReducedMotion();
  const [localThreads, setLocalThreads] = useState(threads);
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(threads[0]?.id || null);
  const [flyingBubble, setFlyingBubble] = useState<FlyingBubbleState | null>(null);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<Message | null>(null);
  const [pendingThread, setPendingThread] = useState<Thread | null>(null);
  const [typingMessage, setTypingMessage] = useState<Message | null>(null);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);
  const typingAnchorRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const autoScrollRef = useRef(true);
  const submitLockRef = useRef(false);
  const activeRequestIdRef = useRef(0);
  const completedLaunchIdRef = useRef<string | null>(null);

  const activeThread = useMemo(
    () => localThreads.find((item) => item.id === activeThreadId) || localThreads[0],
    [localThreads, activeThreadId]
  );
  const messages = useMemo(
    () => sortMessages(activeThread?.messages || []),
    [activeThread?.messages]
  );
  const isChatBusy = phase !== "idle";
  const canAsk = !isChatBusy && question.trim().length > 0;
  const displayedMessages = useMemo(() => {
    let visibleMessages = pendingThread
      ? sortMessages((pendingThread.messages || []).filter((message) => message.id !== typingMessage?.id))
      : messages;

    if (optimisticUserMessage && !pendingThread) {
      visibleMessages = sortMessages([...visibleMessages, optimisticUserMessage]);
    }

    if (typingMessage) {
      visibleMessages = sortMessages([...visibleMessages, typingMessage]);
    }

    return visibleMessages;
  }, [messages, optimisticUserMessage, pendingThread, typingMessage]);

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
        if (viewport) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: "auto"
          });
        }
        scrollFrameRef.current = null;
        return;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const overflow = anchorRect.bottom - viewportRect.bottom + 24;
      const above = anchorRect.top - viewportRect.top - 24;
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
  }, []);

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
    if (phase === "idle") {
      setLocalThreads(threads);
    }
  }, [phase, threads]);

  useEffect(() => {
    if (activeThreadId && !localThreads.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId(localThreads[0]?.id || null);
    }
  }, [activeThreadId, localThreads]);

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
    const safeLeft = (viewportRect?.left ?? 16) + 14;
    const safeRight = (viewportRect?.right ?? window.innerWidth - 16) - 14;
    const safeTop = (viewportRect?.top ?? 80) + 14;
    const safeBottom = (viewportRect?.bottom ?? window.innerHeight - 120) - 14;
    const containerWidth = Math.max(210, safeRight - safeLeft);
    const width = Math.min(containerWidth, Math.max(210, Math.min(containerWidth * 0.82, 520)));
    const minLeft = safeLeft;
    const maxLeft = Math.max(minLeft, safeRight - width);
    const fromLeft = clampNumber(sourceRect ? sourceRect.right - width : maxLeft, minLeft, maxLeft);
    const fromTop = clampNumber(sourceRect ? sourceRect.top : safeBottom - 76, safeTop, Math.max(safeTop, safeBottom - 76));
    const toLeft = clampNumber(safeRight - width, minLeft, maxLeft);
    const toTop = clampNumber(safeBottom - 76, safeTop, Math.max(safeTop, safeBottom - 76));

    return {
      id: `workspace-flying-${Date.now()}`,
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

    setOptimisticUserMessage({
      id: `optimistic-workspace-user-${Date.now()}`,
      role: "USER",
      content: text,
      sequence: nextSequence,
      createdAt: new Date().toISOString(),
      sources: []
    });
    scheduleScrollToBottom(true);
  }

  function finishAiTyping(finalThread: Thread, latestAiMessage: Message | null) {
    setLocalThreads((current) => [
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

    if (latestAiMessage) {
      router.refresh();
    }
  }

  function startAiTyping(finalThread: Thread) {
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const sortedMessages = sortMessages(finalThread.messages || []);
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
          ...(caseId ? { caseId } : {}),
          ...(documentId ? { documentId } : {}),
          question: text,
          title: text.slice(0, 80),
          language
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

  async function ask() {
    const text = question.trim();
    if (!text || isChatBusy || submitLockRef.current) return;

    submitLockRef.current = true;
    completedLaunchIdRef.current = null;
    const requestContext = { threadId: activeThread?.id || null };
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

  return (
    <div className="relative">
      <GlassSurface
        className="fade-in-up overflow-hidden"
        borderRadius={28}
        backgroundOpacity={0.14}
        blur={14}
        saturation={1.38}
        innerClassName="p-5"
      >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t(language, "aiLegalAssistance")}</p>
              <p className="text-xs text-muted-foreground text-wrap-safe">
                Grounded in Pakistani-law starter data and the current case file.
                {role === "CLIENT" && simpleLanguageMode ? " Plain-language mode is on." : ""}
              </p>
            </div>

            {localThreads.length ? (
              <select
                value={activeThread?.id}
                disabled={isChatBusy}
                onChange={(e) => setActiveThreadId(e.target.value)}
                className="glass-chip h-10 max-w-full rounded-2xl bg-background px-3 text-xs text-foreground shadow-sm [color-scheme:light] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#05070d] dark:text-slate-100 dark:[color-scheme:dark]"
              >
                {localThreads.map((thread) => (
                  <option key={thread.id} value={thread.id} className="bg-background text-foreground dark:bg-[#05070d] dark:text-slate-100">
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

          <div
            ref={chatViewportRef}
            onScroll={handleChatScroll}
            className="message-list native-scroll-area premium-scroll max-h-[420px] space-y-3 overflow-y-auto pr-1"
          >
            {displayedMessages.map((message) => (
              <PanelMessageBubble
                key={message.id}
                message={message}
                isTyping={typingMessage?.id === message.id && phase === "typingAI"}
                typingAnchorRef={typingAnchorRef}
              />
            ))}

            {phase === "waitingForAI" ? <PanelThinkingBubble /> : null}

            {!displayedMessages.length ? (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Ask about your uploaded document, your case status, rights, risks,
                evidence gaps, or what to do next.
              </div>
            ) : null}
          </div>

          <div className="assistant-composer mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Textarea
              ref={composerRef}
              value={question}
              disabled={isChatBusy}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canAsk) void ask();
                }
              }}
              aria-label="Case AI assistant message"
              placeholder={t(language, "askQuestion")}
              className="min-h-[84px] resize-none bg-white/25 dark:bg-white/5"
            />
            <Button className="h-12 w-full sm:w-auto" onClick={() => void ask()} disabled={!canAsk}>
              {isChatBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {phase === "launchingUserMessage" ? "Sending..." : "Thinking..."}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t(language, "askQuestion")}
                </>
              )}
            </Button>
          </div>
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

function PanelMessageBubble({
  message,
  isTyping = false,
  typingAnchorRef
}: {
  message: Message;
  isTyping?: boolean;
  typingAnchorRef?: MutableRefObject<HTMLDivElement | null>;
}) {
  const isAi = message.role === "AI";
  const displayContent = isAi ? stripAssistantActionMeta(message.content) : message.content;
  const bubble = (
    <div
      className={cn(
        "max-w-[92%] rounded-2xl border p-4 break-words [overflow-wrap:anywhere] md:max-w-[84%]",
        isAi
          ? "glass-subtle border-primary/20 bg-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
          : "border-primary bg-primary text-primary-foreground shadow-soft"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.16em]",
            isAi ? "text-muted-foreground" : "text-primary-foreground/80"
          )}
        >
          {isAi ? "AI" : "You"}
        </p>

        {isAi && typeof message.confidence === "number" ? (
          <Badge variant="secondary">
            {Math.round(message.confidence * 100)}%
          </Badge>
        ) : null}
      </div>

      <div className="mt-3">
        {isAi ? (
          <>
            {displayContent.trim() ? (
              <FormattedAiContent content={displayContent} />
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">AI is drafting the response...</p>
            )}
            {isTyping ? (
              <span className="mt-2 inline-block h-4 w-[2px] animate-pulse rounded-full bg-primary align-bottom" />
            ) : null}
            <AiTranslationActions text={displayContent} />
          </>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-primary-foreground [overflow-wrap:anywhere]">
            {displayContent}
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
  );

  if (isTyping) {
    return (
      <motion.div
        ref={typingAnchorRef}
        className={cn("flex", isAi ? "justify-start" : "justify-end")}
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        {bubble}
      </motion.div>
    );
  }

  return <div className={cn("flex", isAi ? "justify-start" : "justify-end")}>{bubble}</div>;
}

function PanelThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="glass-subtle flex items-center gap-3 rounded-[1.5rem] border-primary/20 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Thinking through the case file...
      </div>
    </div>
  );
}

function normalizeThread(raw: any): Thread {
  return {
    id: String(raw.id),
    title: raw.title || null,
    messages: Array.isArray(raw.messages)
      ? sortMessages(
          raw.messages.map((message: any) => ({
            id: String(message.id),
            role: String(message.role || "AI"),
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

function sortMessages(messages: Message[]) {
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
