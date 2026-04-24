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
  variant = "outline"
}: {
  children: React.ReactNode;
  variant?: "secondary" | "outline" | "warning" | "success" | "destructive";
}) {
  return (
    <Badge
      variant={variant as any}
      className={cn(
        "inline-flex h-8 max-w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-full px-3",
        "text-[11px] font-semibold leading-none"
      )}
    >
      <span className="block min-w-0 max-w-full truncate whitespace-nowrap">
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
            className="grid grid-cols-[78px_16px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[92px_16px_minmax(0,1fr)]"
          >
            <div className="pt-3 text-right text-xs text-muted-foreground">
              {date ? formatDate(date, "dd MMM yyyy") : "No date"}
            </div>

            <div className="relative flex justify-center self-stretch">
              {index !== sorted.length - 1 ? (
                <div className="absolute bottom-[-18px] top-6 w-px bg-border" />
              ) : null}

              <div className="relative z-10 mt-3 h-3.5 w-3.5 rounded-full bg-primary ring-4 ring-background" />
            </div>

            <Card className="min-w-0 overflow-hidden border-border/70 bg-background/85 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="p-4">
                <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_112px]">
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

                  <div className="flex min-w-0 flex-row flex-wrap items-start gap-2 sm:flex-col sm:items-end">
                    {sourceLabel ? (
                      <TimelineBadge variant={tone(item.sourceLabel) as any}>
                        {sourceLabel}
                      </TimelineBadge>
                    ) : null}

                    {confidence !== null && String(item.sourceLabel).toLowerCase() !== "roadmap" ? (
                      <TimelineBadge variant="secondary">
                        {confidence}%
                      </TimelineBadge>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}