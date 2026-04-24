"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";

export function LoginForm() {
  const router = useRouter();
  const language = useLanguage();
  const [email, setEmail] = useState("client@mizan.dev");
  const [password, setPassword] = useState("demo12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Unable to sign in.");
      return;
    }

    router.push(data.redirectTo);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t(language, "login")} to MIZAN</CardTitle>
        <CardDescription>
          Use the seeded demo credentials or your own account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? "Signing in..." : t(language, "login")}
          </Button>
          <p className="text-xs text-muted-foreground">
            Demo: client@mizan.dev / demo12345 or lawyer@mizan.dev / demo12345
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
