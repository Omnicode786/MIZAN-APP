"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/workspace/app-shell";
import { SectionHeader } from "@/components/workspace/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CLIENT_NAV } from "@/lib/constants";
import { redactText } from "@/lib/document-pipeline/redact";

const SAMPLE_TEXT = `Name: Ayesha Khan, CNIC 35202-1234567-8, phone 0300-1234567, account PK29ABCD1234567890123456, address 14 Block B Main Road.`;

export default function RedactionPage() {
  const [rules, setRules] = useState<string[]>(["phone", "cnic", "bank"]);
  const redacted = useMemo(() => redactText(SAMPLE_TEXT, rules), [rules]);

  function toggle(rule: string) {
    setRules((current) => (current.includes(rule) ? current.filter((item) => item !== rule) : [...current, rule]));
  }

  return (
    <AppShell nav={CLIENT_NAV} heading="Shared" currentPath="/redaction" user={{ name: "MIZAN", role: "CLIENT" }}>
      <SectionHeader
        eyebrow="Privacy Studio"
        title="Prepare safe-to-share copies"
        description="Use the live redaction API from a case workspace to export masked text. This page previews the masking logic used for IDs, bank data, and addresses."
        action={<div />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium">Masking selectors</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {["phone", "email", "cnic", "passport", "bank", "address"].map((rule) => {
                const active = rules.includes(rule);
                return <Button key={rule} variant={active ? "default" : "outline"} onClick={() => toggle(rule)}>{rule}</Button>;
              })}
            </div>
            <div className="mt-6 rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">{SAMPLE_TEXT}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium">Redacted preview</p>
            <div className="mt-6 rounded-2xl border border-border/70 bg-background p-4 text-sm">{redacted}</div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
