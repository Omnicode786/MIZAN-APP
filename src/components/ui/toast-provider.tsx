"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info";

type ToastInput = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastRecord = Required<Omit<ToastInput, "title">> & {
  id: string;
  title?: string;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  success: (description: string, title?: string) => string;
  error: (description: string, title?: string) => string;
  warning: (description: string, title?: string) => string;
  info: (description: string, title?: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: TriangleAlert,
  info: Info
};

function createToastId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = createToastId();
      const nextToast: ToastRecord = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant || "info",
        duration: input.duration ?? 4200
      };

      setToasts((current) => [nextToast, ...current].slice(0, 5));
      window.setTimeout(() => dismiss(id), nextToast.duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (description, title) => toast({ description, title, variant: "success" }),
      error: (description, title) => toast({ description, title, variant: "error", duration: 5600 }),
      warning: (description, title) => toast({ description, title, variant: "warning" }),
      info: (description, title) => toast({ description, title, variant: "info" }),
      dismiss
    }),
    [dismiss, toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-[420px] flex-col gap-3 sm:right-6 sm:top-6"
      >
        {toasts.map((item) => {
          const Icon = icons[item.variant];
          return (
            <div
              key={item.id}
              data-variant={item.variant}
              className="mizan-toast pointer-events-auto flex min-w-0 items-start gap-3 rounded-2xl p-4"
            >
              <div className="mizan-toast-icon mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                {item.title ? (
                  <p className="break-words text-sm font-semibold leading-5">{item.title}</p>
                ) : null}
                <p
                  className={cn(
                    "break-words text-sm leading-5",
                    item.title ? "mt-1 text-muted-foreground" : "text-foreground"
                  )}
                >
                  {item.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
