import { MetricCard } from "@/components/workspace/metric-card";

export function RiskReadinessDashboard({
  metrics
}: {
  metrics: Array<{ label: string; value: number; change?: string }>;
}) {
  if (!metrics?.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
        No readiness metrics available yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 fade-in-up">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          change={metric.change}
        />
      ))}
    </div>
  );
}
