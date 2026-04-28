"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Filter,
  Landmark,
  MapPin,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound
} from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";
import { ThemePresetToggle } from "@/components/theme-preset-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { UiModeToggle } from "@/components/ui-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { cn } from "@/lib/utils";

type PublicLawyer = {
  id: string;
  name: string;
  firmName: string | null;
  bio: string | null;
  specialties: string[];
  yearsExperience: number;
  hourlyRate: number | null;
  fixedFeeFrom: number | null;
  verifiedBadge: boolean;
  rating: number | null;
  city: string | null;
};

type PublicUser = {
  name: string;
  role: "CLIENT" | "LAWYER" | "ADMIN" | string;
} | null;

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#workflow", label: "Workflow" },
  { href: "/#agent", label: "Case Agent" },
  { href: "/pricing", label: "Plans" }
];

export function PublicLawyersDirectory({
  lawyers,
  user
}: {
  lawyers: PublicLawyer[];
  user: PublicUser;
}) {
  const language = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");

  const cities = useMemo(
    () => Array.from(new Set(lawyers.map((lawyer) => lawyer.city).filter(Boolean))).sort() as string[],
    [lawyers]
  );

  const specialties = useMemo(
    () => Array.from(new Set(lawyers.flatMap((lawyer) => lawyer.specialties))).sort(),
    [lawyers]
  );

  const filteredLawyers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return lawyers.filter((lawyer) => {
      const matchesQuery =
        !search ||
        [
          lawyer.name,
          lawyer.firmName || "",
          lawyer.city || "",
          lawyer.bio || "",
          ...lawyer.specialties
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesCity = selectedCity === "all" || lawyer.city === selectedCity;
      const matchesSpecialty =
        selectedSpecialty === "all" || lawyer.specialties.includes(selectedSpecialty);

      return matchesQuery && matchesCity && matchesSpecialty;
    });
  }, [lawyers, query, selectedCity, selectedSpecialty]);

  const dashboardHref = user?.role === "LAWYER" ? "/lawyer/dashboard" : "/client/dashboard";

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(180deg,rgba(37,99,235,0.10),rgba(255,255,255,0))] dark:bg-[linear-gradient(180deg,rgba(96,165,250,0.10),rgba(2,6,23,0))]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:48px_48px] text-primary" />
      </div>

      <div className="mx-auto max-w-[1440px] px-6 py-4 xl:px-8">
        <GlassSurface
          className="nav-surface sticky top-4 z-40 rounded-xl border border-border/70 bg-card/92 shadow-[0_1px_3px_rgba(0,0,0,0.06)] backdrop-blur"
          width="100%"
          height="auto"
          borderRadius={18}
          borderWidth={0.09}
          brightness={50}
          opacity={0.93}
          blur={11}
          displace={0.3}
          backgroundOpacity={0.12}
          saturation={1.16}
          distortionScale={-170}
          mixBlendMode="screen"
        >
          <div className="grid min-h-14 w-full grid-cols-12 items-center gap-x-4 px-4 py-2 lg:px-6">
            <div className="col-span-6 flex items-center lg:col-span-3">
              <Logo />
            </div>

            <nav className="col-span-5 hidden h-full items-center justify-center gap-6 text-[14px] font-medium text-muted-foreground lg:flex">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-full items-center transition-colors duration-200 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="col-span-6 flex items-center justify-end gap-2 lg:col-span-4">
              <LanguageToggle compact />
              <ThemePresetToggle compact className="hidden sm:inline-flex" />
              <UiModeToggle compact className="h-8 rounded-xl px-2.5" />
              <ThemeToggle className="h-8 w-8 rounded-xl" />

              {user ? (
                <Button asChild className="h-8 rounded-xl px-4 text-[14px]">
                  <Link href={dashboardHref}>
                    Workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="hidden h-8 rounded-xl px-3 text-[14px] sm:inline-flex">
                    <Link href="/login">{t(language, "login")}</Link>
                  </Button>
                  <Button asChild className="h-8 rounded-xl px-4 text-[14px]">
                    <Link href="/signup">
                      {t(language, "getStarted")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </GlassSurface>

        <main>
          <section className="py-8 lg:py-10">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
              <motion.div
                className="lg:col-span-7"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
              >
                <div className="flex h-full flex-col justify-between rounded-[20px] border border-border/70 bg-card p-5 shadow-[0_10px_36px_rgba(15,23,42,0.05)] lg:p-7">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-md px-3 py-1">
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        Public lawyer directory
                      </Badge>
                      <Badge variant="outline" className="rounded-md px-3 py-1">
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        MIZAN profile verification
                      </Badge>
                    </div>

                    <h1 className="mt-5 max-w-3xl text-balance text-[42px] font-bold leading-[50px] tracking-[-0.02em] md:text-[56px] md:leading-[64px]">
                      Find lawyers before you open a case workspace.
                    </h1>

                    <p className="mt-5 max-w-2xl text-[14px] leading-[24px] text-muted-foreground">
                      Browse public profiles, compare specialties, and start your matter when you are ready.
                      Inside MIZAN, clients send structured case requests and lawyers respond with proposals.
                    </p>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button asChild className="rounded-xl">
                      <Link href="/signup">
                        Start your case
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href="#directory">Browse profiles</Link>
                    </Button>
                  </div>
                </div>
              </motion.div>

              <motion.aside
                className="lg:col-span-5"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20, scale: 0.985 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.08, duration: 0.75, ease: "easeOut" }}
              >
                <div className="relative h-full overflow-hidden rounded-[20px] border border-border/70 bg-card p-5 shadow-[0_10px_36px_rgba(15,23,42,0.05)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_36%)]" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Directory overview</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Public profiles visible to clients.
                        </p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <UsersRound className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                      <DirectoryStat icon={BriefcaseBusiness} label="Profiles" value={lawyers.length} />
                      <DirectoryStat icon={BadgeCheck} label="Verified" value={lawyers.filter((item) => item.verifiedBadge).length} />
                      <DirectoryStat icon={Landmark} label="Cities" value={cities.length || "Open"} />
                    </div>

                    <div className="mt-5 rounded-xl border border-border/70 bg-background/80 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <p className="text-sm leading-6 text-muted-foreground">
                          Contact and deeper collaboration unlock through the client workspace after a proposal is approved.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.aside>
            </div>
          </section>

          <section id="directory" className="pb-12">
            <motion.div
              className="rounded-[20px] border border-border/70 bg-card p-4 shadow-[0_10px_36px_rgba(15,23,42,0.05)] lg:p-5"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_220px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name, city, specialty, or firm"
                    className="h-11 rounded-xl pl-10"
                  />
                </div>

                <select
                  value={selectedCity}
                  onChange={(event) => setSelectedCity(event.target.value)}
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All cities</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSpecialty}
                  onChange={(event) => setSelectedSpecialty(event.target.value)}
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All specialties</option>
                  {specialties.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span>{filteredLawyers.length} public profiles shown</span>
                </div>
                <Badge variant="outline" className="rounded-md px-3 py-1">
                  Proposal based workflow
                </Badge>
              </div>
            </motion.div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredLawyers.map((lawyer, index) => (
                <LawyerCard
                  key={lawyer.id}
                  lawyer={lawyer}
                  index={index}
                  shouldReduceMotion={shouldReduceMotion}
                />
              ))}
            </div>

            {!filteredLawyers.length ? (
              <div className="mt-5 rounded-[20px] border border-dashed border-border bg-card p-8 text-center">
                <Scale className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="mt-4 text-lg font-semibold">No matching public profiles</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Try a broader search or clear one of the filters.
                </p>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}

function DirectoryStat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof BriefcaseBusiness;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function LawyerCard({
  lawyer,
  index,
  shouldReduceMotion
}: {
  lawyer: PublicLawyer;
  index: number;
  shouldReduceMotion: boolean | null;
}) {
  const initials = lawyer.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ delay: Math.min(index * 0.04, 0.22), duration: 0.5, ease: "easeOut" }}
    >
      <Card className="h-full overflow-hidden rounded-[20px] border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                {initials || "ML"}
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{lawyer.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lawyer.firmName || "Independent practice"}
                </p>
              </div>
            </div>
            {lawyer.verifiedBadge ? (
              <Badge variant="success" className="rounded-md px-2.5 py-1">
                Verified
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {lawyer.city ? (
              <Badge variant="outline" className="rounded-md px-2.5 py-1">
                <MapPin className="mr-1 h-3.5 w-3.5" />
                {lawyer.city}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="rounded-md px-2.5 py-1">
              <BriefcaseBusiness className="mr-1 h-3.5 w-3.5" />
              {lawyer.yearsExperience} yrs
            </Badge>
            {typeof lawyer.rating === "number" ? (
              <Badge variant="warning" className="rounded-md px-2.5 py-1">
                <Star className="mr-1 h-3.5 w-3.5" />
                {lawyer.rating.toFixed(1)}
              </Badge>
            ) : null}
          </div>

          <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
            {lawyer.bio || "Public profile available for structured client requests through MIZAN."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {lawyer.specialties.slice(0, 5).map((item) => (
              <Badge key={item} variant="outline" className="rounded-md px-2.5 py-1">
                {item}
              </Badge>
            ))}
          </div>

          <div className="mt-auto pt-5">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Pricing signal
              </p>
              <p className="mt-1 text-sm font-semibold">
                {lawyer.fixedFeeFrom
                  ? `From PKR ${lawyer.fixedFeeFrom.toLocaleString()}`
                  : lawyer.hourlyRate
                    ? `PKR ${lawyer.hourlyRate.toLocaleString()} / hour`
                    : "Proposal based pricing"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
