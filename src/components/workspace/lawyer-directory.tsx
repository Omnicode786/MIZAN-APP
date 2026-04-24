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

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/lawyers/public${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setLawyers(data.lawyers || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function requestLawyer(lawyerProfileId: string) {
    if (!selectedCaseId) return;
    const res = await fetch(`/api/cases/${selectedCaseId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lawyerProfileId })
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, specialty, city, or firm" />
        <select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className="h-10 rounded-2xl border border-border bg-background px-4 text-sm">
          {cases.map((item) => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
        <Button variant="outline" onClick={load}>{loading ? "Searching…" : "Search"}</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {lawyers.map((lawyer) => (
          <Card key={lawyer.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{lawyer.user.name}</h3>
                  <p className="text-sm text-muted-foreground">{lawyer.firmName || "Independent practice"}{lawyer.city ? ` · ${lawyer.city}` : ""}</p>
                </div>
                {lawyer.verifiedBadge ? <Badge variant="success">Verified</Badge> : null}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{lawyer.bio || "No bio yet."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(lawyer.specialties || []).map((item: string) => <Badge key={item} variant="outline">{item}</Badge>)}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>{lawyer.yearsExperience} years</span>
                <span>{lawyer.fixedFeeFrom ? `From PKR ${lawyer.fixedFeeFrom.toLocaleString()}` : "Fee on proposal"}</span>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => requestLawyer(lawyer.id)} disabled={!selectedCaseId}>Request for selected case</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
