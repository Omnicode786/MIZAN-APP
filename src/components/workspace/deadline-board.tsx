import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate, relativeDate } from "@/lib/utils";

export function DeadlineBoard({ deadlines }: { deadlines: any[] }) {
  if (!deadlines?.length) {
    return (
      <div className="w-full rounded-3xl border border-dashed border-border bg-card/70 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium">No deadlines yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
          Deadlines detected from documents or added manually will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {deadlines.map((deadline) => {
        const tone = getDeadlineTone(deadline);
        const Icon = tone.icon;

        return (
          <Card
            key={deadline.id}
            className={cn(
              "w-full overflow-hidden border-border/70 bg-background/75 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg",
              tone.border
            )}
          >
            <CardContent className="p-0">
              <div className="flex w-full items-start gap-4 p-4 sm:p-5">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                    tone.iconBox
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="break-words text-sm font-semibold leading-5">
                        {deadline.title}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {formatDate(deadline.dueDate)}
                      </p>
                    </div>

                    <Badge
                      variant={tone.badgeVariant}
                      className="w-fit shrink-0 rounded-full px-2.5 py-0.5 text-[11px]"
                    >
                      {deadline.status}
                    </Badge>
                  </div>

                  {deadline.notes ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {deadline.notes}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full px-2.5 py-0.5 text-[11px]"
                    >
                      {deadline.importance || "NORMAL"}
                    </Badge>

                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {relativeDate(deadline.dueDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={cn("h-1 w-full", tone.bar)} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function getDeadlineTone(deadline: any): {
  icon: any;
  badgeVariant: "secondary" | "warning" | "destructive" | "success" | "outline";
  iconBox: string;
  border: string;
  bar: string;
} {
  if (deadline.status === "COMPLETED") {
    return {
      icon: CheckCircle2,
      badgeVariant: "success",
      iconBox: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      border: "hover:border-emerald-500/30",
      bar: "bg-emerald-500/70"
    };
  }

  if (deadline.status === "OVERDUE") {
    return {
      icon: AlertTriangle,
      badgeVariant: "destructive",
      iconBox: "bg-destructive/10 text-destructive",
      border: "hover:border-destructive/30",
      bar: "bg-destructive/70"
    };
  }

  if (deadline.importance === "HIGH" || deadline.importance === "CRITICAL") {
    return {
      icon: CalendarClock,
      badgeVariant: "warning",
      iconBox: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      border: "hover:border-amber-500/30",
      bar: "bg-amber-500/70"
    };
  }

  if (deadline.status === "UPCOMING") {
    return {
      icon: Clock3,
      badgeVariant: "secondary",
      iconBox: "bg-primary/10 text-primary",
      border: "hover:border-primary/30",
      bar: "bg-primary/70"
    };
  }

  return {
    icon: CalendarCheck2,
    badgeVariant: "outline",
    iconBox: "bg-muted text-muted-foreground",
    border: "hover:border-border",
    bar: "bg-border"
  };
}
