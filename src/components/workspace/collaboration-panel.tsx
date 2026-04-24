import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { relativeDate } from "@/lib/utils";

export function CollaborationPanel({ comments }: { comments: any[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={comment.author?.name || comment.authorName || "User"} className="h-9 w-9 text-xs" />
                <div className="flex-1">
                  <p className="font-medium">{comment.author?.name || comment.authorName}</p>
                  <p className="text-xs text-muted-foreground">{relativeDate(comment.createdAt)}</p>
                </div>
                <Badge variant={comment.visibility === "PRIVATE" ? "destructive" : "secondary"}>
                  {comment.visibility}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{comment.body}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
