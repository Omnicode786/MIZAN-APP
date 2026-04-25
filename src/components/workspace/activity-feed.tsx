import { Card, CardContent } from "@/components/ui/card";
import { relativeDate, toTitleCase } from "@/lib/utils";

export function ActivityFeed({ items }: { items: any[] }) {
  const safeItems = items || [];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-4">
          {safeItems.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 p-4 soft-hover">
              <div>
                <p className="font-medium">{toTitleCase(item.action)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {relativeDate(item.createdAt)}
              </span>
            </div>
          ))}

          {!safeItems.length ? (
            <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No recent activity yet.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
