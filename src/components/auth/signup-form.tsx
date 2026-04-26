"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";

export function SignupForm() {
  const router = useRouter();
  const language = useLanguage();
  const [name, setName] = useState("New User");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CLIENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || "Unable to create account.");
        return;
      }

      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg animate-in fade-in-0 slide-in-from-bottom-2">
      <CardHeader>
        <CardTitle>{t(language, "signup")}</CardTitle>
        <CardDescription>
          Choose a role and enter the legal workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="md:col-span-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
          </div>
          <div className="md:col-span-2">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
          </div>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
          <select
            className="h-10 rounded-2xl border border-border bg-background px-4 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="CLIENT">Client / Normal User</option>
            <option value="LAWYER">Lawyer</option>
          </select>
          {error ? <p className="md:col-span-2 text-sm text-rose-500">{error}</p> : null}
          <div className="md:col-span-2">
            <Button className="w-full" disabled={loading}>
              {loading ? "Creating account..." : t(language, "signup")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
