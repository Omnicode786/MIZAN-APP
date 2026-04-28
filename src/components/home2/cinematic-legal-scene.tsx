"use client";

import { BadgeCheck, FileSearch, Fingerprint, Gavel, Network, Route, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type CinematicLegalSceneProps = {
  variant?: "hero" | "showcase";
};

const portalCards = [
  { label: "Evidence", value: "Mapped", icon: FileSearch, className: "left-[8%] top-[18%] rotate-[-8deg]" },
  { label: "Timeline", value: "Live", icon: Route, className: "right-[7%] top-[13%] rotate-[7deg]" },
  { label: "Approval", value: "Required", icon: Fingerprint, className: "left-[12%] bottom-[18%] rotate-[6deg]" },
  { label: "Handoff", value: "Ready", icon: Gavel, className: "right-[10%] bottom-[16%] rotate-[-6deg]" }
];

export function CinematicLegalScene({ variant = "hero" }: CinematicLegalSceneProps) {
  return (
    <div
      className={cn(
        "home2-portal-stage relative h-full min-h-[360px] w-full overflow-hidden rounded-[inherit] bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.95),rgba(241,245,249,0.72)_42%,rgba(226,232,240,0.34)_72%,transparent)]",
        variant === "showcase" && "min-h-[520px]"
      )}
    >
      <div className="home2-portal-grid absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(15,23,42,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="home2-portal-glow absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),rgba(217,180,96,0.13)_42%,transparent_68%)] blur-2xl" />

      <div className="home2-portal-ring absolute left-1/2 top-1/2 h-[58%] w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300/70 shadow-[inset_0_0_50px_rgba(148,163,184,0.2)]" />
      <div className="home2-portal-ring absolute left-1/2 top-1/2 h-[42%] w-[68%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-full border border-amber-200/80" />
      <div className="home2-portal-ring absolute left-1/2 top-1/2 h-[72%] w-[42%] -translate-x-1/2 -translate-y-1/2 rotate-[28deg] rounded-full border border-blue-200/80" />

      <div className="home2-portal-core absolute left-1/2 top-1/2 flex h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/70 shadow-[0_36px_110px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
        <div className="home2-portal-core-inner flex h-[74%] w-[74%] items-center justify-center rounded-full bg-slate-950 text-white shadow-[inset_0_0_26px_rgba(255,255,255,0.18)]">
          <ScaleMark />
        </div>
      </div>

      <div className="home2-portal-thread absolute left-[10%] right-[10%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <div className="home2-portal-thread absolute bottom-[18%] left-[14%] right-[18%] h-px rotate-[-11deg] bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
      <div className="home2-portal-thread absolute left-[18%] right-[12%] top-[24%] h-px rotate-[9deg] bg-gradient-to-r from-transparent via-blue-300/80 to-transparent" />

      {portalCards.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className={cn(
              "home2-portal-card magnetic-card absolute w-[42%] max-w-[210px] rounded-[1.35rem] border border-white/80 bg-white/76 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl will-change-transform sm:w-[38%]",
              item.className
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase text-slate-500">{item.label}</p>
                <p className="truncate text-lg font-black tracking-normal">{item.value}</p>
              </div>
            </div>
          </div>
        );
      })}

      <div className="home2-portal-chip absolute left-1/2 top-[11%] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs font-black uppercase text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <Network className="h-4 w-4 text-primary" aria-hidden="true" />
        AI workflow field
      </div>

      <div className="home2-portal-chip absolute bottom-[9%] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs font-black uppercase text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        Human approved
      </div>

      <div className="home2-portal-spark absolute left-[18%] top-[46%] h-4 w-4 rounded-full bg-blue-400/70 shadow-[0_0_30px_rgba(96,165,250,0.8)]" />
      <div className="home2-portal-spark absolute right-[23%] top-[40%] h-3 w-3 rounded-full bg-amber-300/80 shadow-[0_0_28px_rgba(252,211,77,0.8)]" />
      <div className="home2-portal-spark absolute bottom-[30%] right-[34%] h-5 w-5 rounded-full bg-violet-300/70 shadow-[0_0_30px_rgba(196,181,253,0.8)]" />
      <div className="home2-portal-spark absolute bottom-[36%] left-[34%] h-3 w-3 rounded-full bg-slate-400/70 shadow-[0_0_24px_rgba(148,163,184,0.8)]" />
    </div>
  );
}

function ScaleMark() {
  return (
    <div className="relative h-24 w-24">
      <div className="absolute left-1/2 top-4 h-16 w-2 -translate-x-1/2 rounded-full bg-white/90" />
      <div className="absolute left-1/2 top-5 h-2 w-20 -translate-x-1/2 rounded-full bg-white/90" />
      <div className="absolute bottom-2 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full bg-white/90" />
      <div className="absolute left-4 top-9 h-px w-8 rotate-[-18deg] bg-white/60" />
      <div className="absolute right-4 top-9 h-px w-8 rotate-[18deg] bg-white/60" />
      <div className="absolute left-2 top-12 h-3 w-9 rounded-full border border-white/70" />
      <div className="absolute right-2 top-12 h-3 w-9 rounded-full border border-white/70" />
      <BadgeCheck className="absolute bottom-7 left-1/2 h-6 w-6 -translate-x-1/2 text-blue-200" aria-hidden="true" />
    </div>
  );
}
