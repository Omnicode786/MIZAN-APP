import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function tone(sourceLabel?: string) {
  if (sourceLabel === "roadmap") return "warning";
  if (sourceLabel === "system") return "secondary";
  return "outline";
}

export function TimelineView({ items }: { items: any[] }) {
  const sorted = [...items].sort((a, b) => +new Date(a.eventDate) - +new Date(b.eventDate));

  return (
    <div className="space-y-3">
      {sorted.map((item, index) => (
        <div key={item.id || index} className="grid grid-cols-[92px_16px_1fr] items-start gap-3">
          <div className="pt-1 text-right text-xs text-muted-foreground">
            {formatDate(item.eventDate, "dd MMM yyyy")}
          </div>
          <div className="relative flex justify-center">
            <div className="absolute top-2 h-full w-px bg-border" />
            <div className="relative z-10 mt-1 h-3.5 w-3.5 rounded-full bg-primary ring-4 ring-background" />
          </div>
          <Card className="border-border/70">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {item.sourceLabel ? <Badge variant={tone(item.sourceLabel) as any}>{item.sourceLabel}</Badge> : null}
                  {item.confidence && item.sourceLabel !== "roadmap" ? (
                    <Badge variant="secondary">{Math.round(item.confidence * 100)}%</Badge>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
