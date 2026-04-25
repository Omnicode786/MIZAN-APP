import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const severityMap = {
  destructive: "destructive",
  warning: "warning",
  success: "success"
} as const;

export function HeatmapPanel({ items }: { items: any[] }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <Card key={item.clause || index}>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold">{item.clause}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{item.insight}</p>
              </div>
              <Badge variant={severityMap[item.severity as keyof typeof severityMap] ?? "outline"}>
                {item.severity}
              </Badge>
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {item.excerpt}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
