import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function StrategySimulator({ steps }: { steps: any[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.step} className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{step.step}</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={step.risk === "High" ? "destructive" : step.risk === "Medium" ? "warning" : "success"}>
                      {step.risk} risk
                    </Badge>
                    <Badge variant="outline">{step.effort} effort</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Readiness</p>
                    <Progress value={step.readiness} />
                  </div>
                </div>
                {index < steps.length - 1 ? <ArrowRight className="hidden h-5 w-5 text-muted-foreground md:block" /> : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
