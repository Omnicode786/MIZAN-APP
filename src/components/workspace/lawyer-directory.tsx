"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LawyerDirectory({ cases }: { cases: any[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch(`/api/lawyers/public${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.error || "Unable to load lawyers.");

      setLawyers(data?.lawyers || []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to load lawyers."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function requestLawyer(lawyerProfileId: string) {
    if (!selectedCaseId) return;

    try {
      setRequestingId(lawyerProfileId);
      setMessage(null);
      const res = await fetch(`/api/cases/${selectedCaseId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lawyerProfileId })
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.error || "Unable to send lawyer request.");

      setMessage({ type: "success", text: "Lawyer request sent." });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to send lawyer request."
      });
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, specialty, city, or firm"
        />
        <select
          value={selectedCaseId}
          onChange={(e) => setSelectedCaseId(e.target.value)}
          className="h-10 rounded-2xl border border-border bg-background px-4 text-sm"
        >
          {!cases.length ? <option value="">No cases available</option> : null}
          {cases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {message ? (
        <div
          className={`rounded-2xl border p-3 text-sm ${
            message.type === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {lawyers.map((lawyer) => (
          <Card key={lawyer.id} className="soft-hover">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{lawyer.user.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {lawyer.firmName || "Independent practice"}
                    {lawyer.city ? ` - ${lawyer.city}` : ""}
                  </p>
                </div>
                {lawyer.verifiedBadge ? <Badge variant="success">Verified</Badge> : null}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {lawyer.bio || "No bio yet."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(lawyer.specialties || []).map((item: string) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>{lawyer.yearsExperience} years</span>
                <span>
                  {lawyer.fixedFeeFrom
                    ? `From PKR ${lawyer.fixedFeeFrom.toLocaleString()}`
                    : "Fee on proposal"}
                </span>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => requestLawyer(lawyer.id)}
                  disabled={!selectedCaseId || requestingId === lawyer.id}
                >
                  {requestingId === lawyer.id ? "Sending..." : "Request for selected case"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && !lawyers.length ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No public lawyers found yet.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
