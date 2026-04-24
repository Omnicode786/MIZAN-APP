import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toTitleCase } from "@/lib/utils";

export function CaseCard({
  legalCase,
  hrefPrefix
}: {
  legalCase: any;
  hrefPrefix: string;
}) {
  return (
    <Card className="group h-full border-border/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="flex h-full flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{toTitleCase(legalCase.category)}</p>
                <h3 className="text-lg font-semibold tracking-tight">{legalCase.title}</h3>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{legalCase.description}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{toTitleCase(legalCase.status)}</Badge>
              <Badge variant={legalCase.priority === "HIGH" || legalCase.priority === "CRITICAL" ? "destructive" : "secondary"}>
                {toTitleCase(legalCase.priority)}
              </Badge>
              <Badge variant="default">{legalCase.stage}</Badge>
            </div>
          </div>
          <Link
            href={`${hrefPrefix}/${legalCase.id}`}
            className="inline-flex items-center gap-2 self-start rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground transition group-hover:bg-primary group-hover:text-primary-foreground"
          >
            Open
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Case Health</p>
            <Progress value={legalCase.caseHealthScore ?? 74} />
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Evidence Completeness</p>
            <Progress value={legalCase.evidenceCompleteness ?? 64} />
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Draft Readiness</p>
            <Progress value={legalCase.draftReadiness ?? 58} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
