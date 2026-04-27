import { redirect } from "next/navigation";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { LAWYER_NAV } from "@/lib/constants";
import { getObservabilitySnapshot } from "@/lib/observability";

export const dynamic = "force-dynamic";

const OPS_NAV = [...LAWYER_NAV, { href: "/ops", label: "Ops" }];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function statusTone(errorCount: number) {
  return errorCount > 0 ? "bg-red-500/12 text-red-700 dark:text-red-200" : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-200";
}

export default async function OpsPage() {
  const user = await getCurrentUserWithProfile();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect(user.role === "LAWYER" ? "/lawyer/dashboard" : "/client/dashboard");

  const snapshot = getObservabilitySnapshot();
  const routeRows = Object.entries(snapshot.routes)
    .sort(([, a], [, b]) => b.avgMs - a.avgMs)
    .slice(0, 12);
  const aiRows = Object.entries(snapshot.ai)
    .sort(([, a], [, b]) => b.estimatedCostUsd - a.estimatedCostUsd)
    .slice(0, 12);
  const queueRows = Object.entries(snapshot.queue).slice(-12).reverse();
  const storageRows = Object.entries(snapshot.storage).slice(-12).reverse();
  const exportRows = Object.entries(snapshot.exports).slice(-12).reverse();

  const totalRouteCount = Object.values(snapshot.routes).reduce((sum, item) => sum + item.count, 0);
  const totalRouteErrors = Object.values(snapshot.routes).reduce((sum, item) => sum + item.errorCount, 0);
  const aiCost = Object.values(snapshot.ai).reduce((sum, item) => sum + item.estimatedCostUsd, 0);
  const storageErrors = Object.values(snapshot.storage).reduce((sum, item) => sum + item.errorCount, 0);

  return (
    <AppShell nav={OPS_NAV} heading="Operations" currentPath="/ops" user={user}>
      <SectionHeader
        eyebrow="Infra and Ops"
        title="Runtime health and cost dashboard"
        description="Live in-memory observability for route latency, AI usage, action queues, storage, and exports in this server process."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Requests", totalRouteCount],
          ["Route errors", totalRouteErrors],
          ["AI estimated cost", `$${aiCost.toFixed(4)}`],
          ["Storage failures", storageErrors]
        ].map(([label, value]) => (
          <Card key={label} className="soft-hover">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Slowest Routes</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Route</th>
                  <th className="py-2 pr-4">Avg</th>
                  <th className="py-2 pr-4">Max</th>
                  <th className="py-2 pr-4">Count</th>
                  <th className="py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {routeRows.map(([route, item]) => (
                  <tr key={route} className="border-t border-border/70">
                    <td className="max-w-[260px] truncate py-3 pr-4 font-medium">{route}</td>
                    <td className="py-3 pr-4">{formatNumber(item.avgMs)}ms</td>
                    <td className="py-3 pr-4">{formatNumber(item.maxMs)}ms</td>
                    <td className="py-3 pr-4">{item.count}</td>
                    <td className="py-3">
                      <Badge className={statusTone(item.errorCount)}>{item.errorCount}</Badge>
                    </td>
                  </tr>
                ))}
                {!routeRows.length ? (
                  <tr>
                    <td className="py-6 text-muted-foreground" colSpan={5}>
                      No route telemetry has been recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Cost by Feature</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Feature / User / Case</th>
                  <th className="py-2 pr-4">Calls</th>
                  <th className="py-2 pr-4">Input</th>
                  <th className="py-2 pr-4">Output</th>
                  <th className="py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {aiRows.map(([key, item]) => (
                  <tr key={key} className="border-t border-border/70">
                    <td className="max-w-[300px] truncate py-3 pr-4 font-medium">{key}</td>
                    <td className="py-3 pr-4">{item.count}</td>
                    <td className="py-3 pr-4">{formatNumber(item.inputTokens)}</td>
                    <td className="py-3 pr-4">{formatNumber(item.outputTokens)}</td>
                    <td className="py-3">${item.estimatedCostUsd.toFixed(5)}</td>
                  </tr>
                ))}
                {!aiRows.length ? (
                  <tr>
                    <td className="py-6 text-muted-foreground" colSpan={5}>
                      AI usage will appear after assistant requests are made.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {[
          ["Action Queue", queueRows],
          ["Storage", storageRows],
          ["Exports", exportRows]
        ].map(([title, rows]) => (
          <Card key={title as string}>
            <CardHeader>
              <CardTitle>{title as string}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(rows as Array<[string, { count: number; errorCount: number; lastSeenAt?: string }]>).map(([key, item]) => (
                <div key={key} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-border/70 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{key}</p>
                    <p className="text-xs text-muted-foreground">{item.lastSeenAt || "No timestamp"}</p>
                  </div>
                  <Badge className={statusTone(item.errorCount)}>{item.count}</Badge>
                </div>
              ))}
              {!(rows as unknown[]).length ? <p className="text-sm text-muted-foreground">No events recorded yet.</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
