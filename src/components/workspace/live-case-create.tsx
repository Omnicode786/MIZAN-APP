"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CASE_CATEGORIES } from "@/lib/constants";

export function LiveCaseCreate({ role = "CLIENT" }: { role?: "CLIENT" | "LAWYER" }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CASE_CATEGORIES)[number]>("CONTRACT_REVIEW");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState(role === "LAWYER" ? "ACTIVE" : "INTAKE");
  const [stage, setStage] = useState(role === "LAWYER" ? "Private lawyer case opened" : "Document intake");
  const [jurisdiction, setJurisdiction] = useState("");
  const [parties, setParties] = useState("");
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isLawyer = role === "LAWYER";

  async function submit() {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          priority,
          status,
          stage,
          description,
          jurisdiction,
          parties: parties
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          notes: isLawyer ? notes : undefined
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(data?.error || "Unable to create case.");
        return;
      }
      router.push(`/${isLawyer ? "lawyer" : "client"}/cases/${data.case.id}`);
      router.refresh();
    } catch {
      setMessage("Unable to create case. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2">
      <CardContent className="p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Case title" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="h-10 rounded-2xl border border-border bg-background px-4 text-sm"
          >
            {CASE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-10 rounded-2xl border border-border bg-background px-4 text-sm"
          >
            {['LOW','MEDIUM','HIGH','CRITICAL'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="Jurisdiction, e.g. Sindh" />
          <Input value={parties} onChange={(e) => setParties(e.target.value)} placeholder="Parties, comma separated" />
          {isLawyer ? (
            <>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 rounded-2xl border border-border bg-background px-4 text-sm"
              >
                {["DRAFT", "INTAKE", "ACTIVE", "REVIEW", "ESCALATED", "CLOSED"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <Input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Current stage" />
            </>
          ) : null}
          <div className="md:col-span-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isLawyer
                  ? "Summarize the private matter, offline client, internal work, or legal issue."
                  : "What happened, what document do you have, and what outcome do you need?"
              }
            />
          </div>
          {isLawyer ? (
            <div className="md:col-span-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Private lawyer notes. These are not visible to clients."
              />
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={submit} disabled={loading || title.trim().length < 3}>
            {loading ? "Creating..." : "Create case"}
          </Button>
          {message ? <p className="text-sm text-rose-500">{message}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
