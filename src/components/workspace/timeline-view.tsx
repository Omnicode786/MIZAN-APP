import { CalendarClock, FileText, Route, Sparkles, Zap } from "lucide-react";
import { formatDate, toTitleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function tone(sourceLabel?: string) {
  const label = String(sourceLabel || "").toLowerCase();

  if (label.includes("roadmap")) return "warning";
  if (label.includes("system")) return "secondary";
  if (label.includes("agent")) return "secondary";
  if (label.includes("evidence")) return "outline";

  return "outline";
}

function getTimelineVisual(sourceLabel?: string) {
  const label = String(sourceLabel || "").toLowerCase();

  if (label.includes("roadmap")) {
    return {
      icon: Route,
      dot: "bg-amber-500",
      iconBox: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      accent: "bg-amber-500/70",
      card: "hover:border-amber-500/30"
    };
  }

  if (label.includes("agent")) {
    return {
      icon: Sparkles,
      dot: "bg-violet-500",
      iconBox: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      accent: "bg-violet-500/70",
      card: "hover:border-violet-500/30"
    };
  }

  if (label.includes("evidence") || label.includes("document")) {
    return {
      icon: FileText,
      dot: "bg-blue-500",
      iconBox: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      accent: "bg-blue-500/70",
      card: "hover:border-blue-500/30"
    };
  }

  return {
    icon: Zap,
    dot: "bg-primary",
    iconBox: "bg-primary/10 text-primary",
    accent: "bg-primary/70",
    card: "hover:border-primary/30"
  };
}

function TimelinePill({
  children,
  variant = "outline",
  className
}: {
  children: React.ReactNode;
  variant?: "secondary" | "outline" | "warning" | "success" | "destructive";
  className?: string;
}) {
  return (
    <Badge
      variant={variant as any}
      className={cn(
        "min-w-0 max-w-full rounded-full px-2.5 py-1 text-[11px] leading-none",
        className
      )}
    >
      <span className="block min-w-0 max-w-[150px] truncate">
        {children}
      </span>
    </Badge>
  );
}

export function TimelineView({ items }: { items: any[] }) {
  const sorted = [...(items || [])].sort(
    (a, b) => +new Date(a.eventDate || a.createdAt || 0) - +new Date(b.eventDate || b.createdAt || 0)
  );

  if (!sorted.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/70 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium">No timeline events yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
          Timeline events will appear after documents are uploaded or case activity is recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {sorted.map((item, index) => {
        const visual = getTimelineVisual(item.sourceLabel);
        const Icon = visual.icon;

        const date = item.eventDate || item.createdAt || item.updatedAt;
        const sourceLabel = item.sourceLabel
          ? toTitleCase(String(item.sourceLabel).replace(/[-_]/g, " "))
          : null;

        const confidence =
          typeof item.confidence === "number"
            ? Math.round(item.confidence * 100)
            : null;

        return (
          <div
            key={item.id || index}
            className="grid w-full grid-cols-[74px_16px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[92px_18px_minmax(0,1fr)]"
          >
            <div className="pt-3 text-right text-[11px] font-medium leading-5 text-muted-foreground sm:text-xs">
              {date ? formatDate(date, "dd MMM yyyy") : "No date"}
            </div>

            <div className="relative flex justify-center self-stretch">
              {index !== sorted.length - 1 ? (
                <div className="absolute bottom-[-18px] top-6 w-px bg-border" />
              ) : null}

              <div
                className={cn(
                  "relative z-10 mt-3 h-3.5 w-3.5 rounded-full ring-4 ring-background shadow-sm",
                  visual.dot
                )}
              />
            </div>

            <Card
              className={cn(
                "min-w-0 overflow-hidden border-border/70 bg-background/85 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                visual.card
              )}
            >
              <CardContent className="p-0">
                <div className="p-4 sm:p-5">
                  <div className="flex min-w-0 gap-3">
                    <div
                      className={cn(
                        "hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:flex",
                        visual.iconBox
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-6 text-foreground">
                        {item.title || "Timeline event"}
                      </p>

                      {item.description ? (
                        <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex max-w-full flex-wrap items-center gap-2">
                        {sourceLabel ? (
                          <TimelinePill variant={tone(item.sourceLabel) as any}>
                            {sourceLabel}
                          </TimelinePill>
                        ) : null}

                        {confidence !== null && String(item.sourceLabel).toLowerCase() !== "roadmap" ? (
                          <TimelinePill variant="secondary">
                            {confidence}%
                          </TimelinePill>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={cn("h-1 w-full", visual.accent)} />
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}