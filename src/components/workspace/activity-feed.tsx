import { Card, CardContent } from "@/components/ui/card";
import { relativeDate, toTitleCase } from "@/lib/utils";

export function ActivityFeed({ items }: { items: any[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 p-4">
              <div>
                <p className="font-medium">{toTitleCase(item.action)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {relativeDate(item.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
