import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function MetricCard({
  label,
  value,
  change
}: {
  label: string;
  value: number;
  change?: string;
}) {
  return (
    <Card className="overflow-hidden soft-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ArrowUpRight className="h-3 w-3" />
            {change ?? "Stable"}
          </div>
        </div>
        <Progress value={value} className="mt-6" />
      </CardContent>
    </Card>
  );
}
