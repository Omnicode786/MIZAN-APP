"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";

type AssignmentRequest = {
  id: string;
  caseId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | string;
  proposalStatus?: "NOT_SENT" | "SENT" | "ACCEPTED" | "DECLINED" | string;
  case: {
    id: string;
    title: string;
    category: string;
    priority: string;
    client: {
      user: {
        name: string;
      };
    } | null;
  };
};

function statusVariant(status: string): "success" | "destructive" | "warning" {
  if (status === "ACCEPTED") return "success";
  if (status === "DECLINED") return "destructive";
  return "warning";
}

async function requireOk(response: Response, fallback: string) {
  if (response.ok) return;
  const data = await response.json().catch(() => null);
  throw new Error(data?.error || fallback);
}

export function LawyerRequestReviewList({ assignments }: { assignments: AssignmentRequest[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(assignmentId: string, decision: "ACCEPTED" | "DECLINED") {
    try {
      setBusy(`${assignmentId}:${decision}`);

      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "decision", decision })
      });

      await requireOk(response, "Unable to update the case request.");
      toast.success(
        decision === "ACCEPTED"
          ? "Case request accepted. You can now review the case and send terms."
          : "Case request rejected."
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update the case request.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4">
      {assignments.map((assignment) => (
        <Card key={assignment.id} className="soft-hover">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-medium">{assignment.case.title}</p>
                  <Badge variant={statusVariant(assignment.status)}>{assignment.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Client: {assignment.case.client?.user.name || "Registered client"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{assignment.case.category}</Badge>
                  <Badge variant="secondary">{assignment.case.priority}</Badge>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {assignment.status === "ACCEPTED"
                ? assignment.proposalStatus === "ACCEPTED"
                  ? "Proposal accepted. Open the case workspace to continue work."
                  : "Request accepted. Open the case workspace to review details and send collaboration terms."
                : assignment.status === "DECLINED"
                  ? "Rejected. Full case details remain locked."
                  : "Full case details and contact stay locked until you accept this assigned request."}
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {assignment.status === "PENDING" ? (
                <>
                  <Button
                    type="button"
                    onClick={() => decide(assignment.id, "ACCEPTED")}
                    disabled={Boolean(busy)}
                  >
                    {busy === `${assignment.id}:ACCEPTED` ? "Accepting..." : "Accept request"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => decide(assignment.id, "DECLINED")}
                    disabled={Boolean(busy)}
                  >
                    {busy === `${assignment.id}:DECLINED` ? "Rejecting..." : "Reject request"}
                  </Button>
                </>
              ) : assignment.status === "ACCEPTED" ? (
                <Button asChild variant="outline">
                  <Link href={`/lawyer/cases/${assignment.caseId}`}>Open case</Link>
                </Button>
              ) : (
                <span className="rounded-full bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                  Rejected request
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {!assignments.length ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No case requests found yet.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
