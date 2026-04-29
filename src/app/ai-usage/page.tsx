import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bot, CheckCircle2, MessageSquareText, Sparkles, Zap } from "lucide-react";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLIENT_NAV, LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { getAiUsageSummary } from "@/lib/ai-usage";
import { cn, formatDate } from "@/lib/utils";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function percentUsed(used: number, limit: number) {
  if (!limit) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

function UsageMeter({
  label,
  used,
  limit,
  remaining,
  icon: Icon,
  tone = "primary"
}: {
  label: string;
  used: number;
  limit: number;
  remaining: number;
  icon: typeof MessageSquareText;
  tone?: "primary" | "emerald";
}) {
  const usedPercent = percentUsed(used, limit);

  return (
    <Card className="surface-card overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="text-base">{label}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatNumber(remaining)} left this month
          </p>
        </div>
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl",
            tone === "emerald" ? "bg-emerald-500/12 text-emerald-600" : "bg-primary/12 text-primary"
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-black tracking-tight">{formatNumber(used)}</p>
          <p className="pb-1 text-sm font-semibold text-muted-foreground">of {formatNumber(limit)}</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              tone === "emerald" ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">{usedPercent}% used</p>
      </CardContent>
    </Card>
  );
}

const paidPlans = [
  {
    name: "Pro Client",
    price: "More AI chats",
    icon: Sparkles,
    points: ["Higher monthly chat limits", "More AI token room", "Advanced evidence help", "Priority drafting tools"]
  },
  {
    name: "Lawyer Workspace",
    price: "Team-grade AI",
    icon: Zap,
    points: ["Bigger case analysis allowance", "Draft approval workflows", "AI debate and review tools", "Workspace analytics"]
  }
];

export default async function AiUsagePage() {
  const user = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const nav = user.role === "LAWYER" || user.role === "ADMIN" ? LAWYER_NAV : CLIENT_NAV;
  const usage = await getAiUsageSummary(user.id);
  const resetDate = formatDate(usage.periodEnd, "dd MMM yyyy");

  return (
    <AppShell nav={nav} heading="AI Usage" currentPath="/ai-usage" user={user}>
      <SectionHeader
        eyebrow="AI Usage"
        title="Your free AI allowance"
        description="See how many AI chats and estimated tokens you have left this month. Paid plans unlock more room for heavier legal work."
        action={
          <Button asChild className="rounded-2xl">
            <Link href="/pricing">
              See paid plans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_0.82fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <UsageMeter
            label="AI chats"
            used={usage.chatsUsed}
            limit={usage.chatsLimit}
            remaining={usage.chatsRemaining}
            icon={MessageSquareText}
          />
          <UsageMeter
            label="Estimated tokens"
            used={usage.tokensUsed}
            limit={usage.tokensLimit}
            remaining={usage.tokensRemaining}
            icon={Bot}
            tone="emerald"
          />
        </div>

        <Card className="surface-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Current plan</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight">{usage.planName}</h2>
              </div>
              <Badge className="rounded-full px-3 py-1">Resets {resetDate}</Badge>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
              <div className="glass-subtle rounded-2xl p-3">
                Free AI is best for light chat, first-pass case guidance, and simple document help.
              </div>
              <div className="glass-subtle rounded-2xl p-3">
                Heavier drafting, long evidence review, and frequent agent work can use the allowance faster.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {paidPlans.map((plan) => {
          const Icon = plan.icon;

          return (
            <Card key={plan.name} className="surface-card overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-primary">{plan.price}</p>
                    <h3 className="mt-1 text-2xl font-black tracking-tight">{plan.name}</h3>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-5 grid gap-2">
                  {plan.points.map((point) => (
                    <div key={point} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {point}
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" className="mt-6 h-11 w-full rounded-2xl">
                  <Link href="/pricing">Upgrade options</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
