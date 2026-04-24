import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LawyersPage() {
  const lawyers = await prisma.lawyerProfile.findMany({
    where: { isPublic: true },
    include: { user: true },
    orderBy: [{ verifiedBadge: 'desc' }, { rating: 'desc' }]
  });

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Logo />
        <Button asChild><a href="/signup">Start your case</a></Button>
      </div>

      <div className="mt-16 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Public lawyer profiles</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Lawyers visible to client search</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          These profiles are shown to clients inside the product. Clients initiate the request from their case workspace and the lawyer responds with a proposal.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {lawyers.map((lawyer) => (
          <Card key={lawyer.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">{lawyer.user.name}</h3>
                  <p className="text-sm text-muted-foreground">{lawyer.firmName || 'Independent practice'}{lawyer.city ? ` · ${lawyer.city}` : ''}</p>
                </div>
                {lawyer.verifiedBadge ? <Badge variant="success">Verified</Badge> : null}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{lawyer.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {lawyer.specialties.map((item) => (
                  <Badge key={item} variant="outline">{item}</Badge>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{lawyer.fixedFeeFrom ? `From PKR ${lawyer.fixedFeeFrom.toLocaleString()}` : 'Proposal based pricing'}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
