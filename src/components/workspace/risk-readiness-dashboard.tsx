import { MetricCard } from "@/components/workspace/metric-card";

export function RiskReadinessDashboard({
  metrics
}: {
  metrics: Array<{ label: string; value: number; change?: string }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
