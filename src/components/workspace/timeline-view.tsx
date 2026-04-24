import { formatDate, toTitleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function tone(sourceLabel?: string) {
  const label = String(sourceLabel || "").toLowerCase();

  if (label.includes("roadmap")) return "warning";
  if (label.includes("system")) return "secondary";
  if (label.includes("agent")) return "secondary";

  return "outline";
}

function formatSourceLabel(value?: string) {
  return toTitleCase(String(value || "").replace(/[-_]/g, " "));
}

function TimelineBadge({
  children,
  variant = "outline",
  compact = false
}: {
  children: React.ReactNode;
  variant?: "secondary" | "outline" | "warning" | "success" | "destructive";
  compact?: boolean;
}) {
  return (
    <Badge
      variant={variant as any}
      className={cn(
        "inline-flex min-h-7 max-w-full shrink items-center justify-center overflow-hidden rounded-full px-2.5 py-1",
        "text-center text-[11px] font-semibold leading-4",
        compact ? "w-auto shrink-0 whitespace-nowrap" : "min-w-0"
      )}
    >
      <span
        className={cn(
          "block min-w-0 max-w-full",
          compact ? "whitespace-nowrap" : "whitespace-normal [overflow-wrap:anywhere]"
        )}
      >
        {children}
      </span>
    </Badge>
  );
}

export function TimelineView({ items }: { items: any[] }) {
  const sorted = [...(items || [])].sort(
    (a, b) =>
      +new Date(a.eventDate || a.createdAt || 0) -
      +new Date(b.eventDate || b.createdAt || 0)
  );

  if (!sorted.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/70 p-6 text-center">
        <p className="text-sm font-medium">No timeline events yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
          Timeline events will appear after documents are uploaded or case activity is recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map((item, index) => {
        const date = item.eventDate || item.createdAt || item.updatedAt;
        const sourceLabel = item.sourceLabel ? formatSourceLabel(item.sourceLabel) : null;

        const confidence =
          typeof item.confidence === "number"
            ? Math.round(item.confidence * 100)
            : null;

        return (
          <div
            key={item.id || index}
            className="grid grid-cols-[68px_14px_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[76px_14px_minmax(0,1fr)] sm:gap-3"
          >
            <div className="pt-3 text-right text-[11px] leading-5 text-muted-foreground sm:text-xs">
              {date ? formatDate(date, "dd MMM yyyy") : "No date"}
            </div>

            <div className="relative flex justify-center self-stretch">
              {index !== sorted.length - 1 ? (
                <div className="absolute bottom-[-18px] top-6 w-px bg-border" />
              ) : null}

              <div className="relative z-10 mt-3 h-3 w-3 rounded-full bg-primary ring-4 ring-background sm:h-3.5 sm:w-3.5" />
            </div>

            <Card className="min-w-0 overflow-hidden border-border/70 bg-background/85 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="p-3.5 sm:p-4">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold leading-6">
                    {item.title || "Timeline event"}
                  </p>

                  {item.description ? (
                    <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>

                {(sourceLabel ||
                  (confidence !== null && String(item.sourceLabel).toLowerCase() !== "roadmap")) ? (
                  <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-2">
                    {sourceLabel ? (
                      <TimelineBadge variant={tone(item.sourceLabel) as any}>
                        {sourceLabel}
                      </TimelineBadge>
                    ) : null}

                    {confidence !== null && String(item.sourceLabel).toLowerCase() !== "roadmap" ? (
                      <TimelineBadge variant="secondary" compact>
                        {confidence}%
                      </TimelineBadge>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
