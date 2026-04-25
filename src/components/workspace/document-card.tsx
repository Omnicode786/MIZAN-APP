import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function DocumentCard({ document }: { document: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium">{document.fileName}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{document.aiSummary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">{document.probableCategory}</Badge>
              {(document.tags || []).map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {document.confidence ? <Badge variant="success">{Math.round(document.confidence * 100)}% confidence</Badge> : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
