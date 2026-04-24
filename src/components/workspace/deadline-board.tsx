import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export function DeadlineBoard({ deadlines }: { deadlines: any[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {deadlines.map((deadline) => (
        <Card key={deadline.id}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold">{deadline.title}</h4>
                  <Badge
                    variant={
                      deadline.status === "OVERDUE"
                        ? "destructive"
                        : deadline.importance === "HIGH"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {deadline.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Due {formatDate(deadline.dueDate)} · {deadline.notes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
