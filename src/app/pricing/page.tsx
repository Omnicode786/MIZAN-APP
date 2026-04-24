import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    price: "PKR 0",
    points: ["Create cases", "Upload documents", "Basic AI intake", "Simple draft generation"]
  },
  {
    name: "Pro Client",
    price: "PKR 4,999",
    points: ["Deadline tracker", "Advanced evidence search", "Redaction studio", "Lawyer handoff"]
  },
  {
    name: "Lawyer Workspace",
    price: "PKR 19,999",
    points: ["Multi-case triage", "Draft approvals", "Internal notes", "Deadline cockpit", "Analytics"]
  }
];

export default function PricingPage() {
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Logo />
        <Button variant="outline" asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>

      <div className="mt-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Placeholder plans</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Simple plans for hackathon storytelling</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">
          Replace these with your own launch pricing. This page is included so the product feels startup-complete during demos.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{plan.name}</p>
              <h3 className="mt-3 text-3xl font-semibold">{plan.price}</h3>
              <div className="mt-6 space-y-3">
                {plan.points.map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    {point}
                  </div>
                ))}
              </div>
              <Button className="mt-8 w-full">Choose {plan.name}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
