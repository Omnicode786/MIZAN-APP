import Link from "next/link";
import { Scale, Sparkles } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
        <Scale className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold tracking-wide text-foreground">MIZAN</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Legal case operating system
        </span>
      </div>
    </Link>
  );
}
