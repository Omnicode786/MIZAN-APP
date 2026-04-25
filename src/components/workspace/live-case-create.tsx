"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CASE_CATEGORIES } from "@/lib/constants";

export function LiveCaseCreate() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CASE_CATEGORIES)[number]>("CONTRACT_REVIEW");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, priority, description })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(data?.error || "Unable to create case.");
        return;
      }
      router.push(`/client/cases/${data.case.id}`);
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
          <div className="md:col-span-2">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened, what document do you have, and what outcome do you need?" />
          </div>
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
