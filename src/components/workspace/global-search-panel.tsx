"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  FolderSearch,
  Gavel,
  Loader2,
  MessageSquareText,
  Scale,
  Search,
  Sparkles,
  StickyNote,
  UserRoundSearch
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { relativeDate, toTitleCase } from "@/lib/utils";

type SearchCategory =
  | "all"
  | "cases"
  | "documents"
  | "evidence"
  | "lawyers"
  | "timeline"
  | "deadlines"
  | "drafts"
  | "comments";

type GlobalSearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  href: string;
  caseId?: string | null;
  caseTitle?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  tags?: string[];
  matchedFields?: string[];
  score?: number;
};

type SearchResponse = {
  query: string;
  category: SearchCategory;
  count: number;
  totals: Record<Exclude<SearchCategory, "all">, number>;
  results: GlobalSearchResult[];
};

const categoryConfig: Array<{
  key: SearchCategory;
  label: string;
  description: string;
  icon: typeof Search;
}> = [
  { key: "all", label: "All", description: "Everything you can access", icon: FolderSearch },
  { key: "cases", label: "Cases", description: "Your active and archived matters", icon: BriefcaseBusiness },
  { key: "documents", label: "Documents", description: "Uploaded files and summaries", icon: FileText },
  { key: "evidence", label: "Evidence", description: "Evidence labels and extracted facts", icon: Scale },
  { key: "lawyers", label: "Lawyers", description: "Public searchable lawyers", icon: UserRoundSearch },
  { key: "timeline", label: "Timeline", description: "Events and important dates", icon: CalendarClock },
  { key: "deadlines", label: "Deadlines", description: "Tasks, hearings, and reminders", icon: Gavel },
  { key: "drafts", label: "Drafts", description: "Legal drafts and versions", icon: StickyNote },
  { key: "comments", label: "Comments", description: "Shared case conversations", icon: MessageSquareText }
];

const typeToCategory: Record<string, SearchCategory> = {
  CASE: "cases",
  DOCUMENT: "documents",
  EVIDENCE: "evidence",
  LAWYER: "lawyers",
  TIMELINE: "timeline",
  DEADLINE: "deadlines",
  DRAFT: "drafts",
  COMMENT: "comments"
};

const typeBadgeVariant: Record<string, "default" | "secondary" | "outline" | "success" | "warning"> = {
  CASE: "default",
  DOCUMENT: "secondary",
  EVIDENCE: "warning",
  LAWYER: "success",
  TIMELINE: "outline",
  DEADLINE: "warning",
  DRAFT: "secondary",
  COMMENT: "outline"
};

function sanitizeCategory(value?: string): SearchCategory {
  const match = categoryConfig.find((item) => item.key === value);
  return match?.key || "all";
}

function categoryTotal(data: SearchResponse | null, category: SearchCategory) {
  if (!data) return 0;
  if (category === "all") return data.count;
  return data.totals[category] || 0;
}

function resultGroups(results: GlobalSearchResult[], category: SearchCategory) {
  if (category !== "all") {
    return [{ category, results }];
  }

  return categoryConfig
    .filter((item) => item.key !== "all")
    .map((item) => ({
      category: item.key,
      results: results.filter((result) => typeToCategory[result.type] === item.key)
    }))
    .filter((group) => group.results.length > 0);
}

export function GlobalSearchPanel({
  initialQuery,
  initialCategory = "all",
  userRole
}: {
  initialQuery: string;
  initialCategory?: string;
  userRole: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<SearchCategory>(sanitizeCategory(initialCategory));
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeCategory = useMemo(
    () => categoryConfig.find((item) => item.key === category) || categoryConfig[0],
    [category]
  );

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setData(null);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();

    async function runSearch() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          q: trimmed,
          category,
          limit: "10"
        });
        const res = await fetch(`/api/search?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store"
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Search failed.");
        }

        setData(json);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Search failed.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    const timer = window.setTimeout(runSearch, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, category]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const params = new URLSearchParams();

    if (trimmed) params.set("q", trimmed);
    if (category !== "all") params.set("category", category);

    router.replace(params.toString() ? `/search?${params.toString()}` : "/search");
  }

  function chooseCategory(nextCategory: SearchCategory) {
    setCategory(nextCategory);
    const trimmed = query.trim();
    const params = new URLSearchParams();

    if (trimmed) params.set("q", trimmed);
    if (nextCategory !== "all") params.set("category", nextCategory);

    router.replace(params.toString() ? `/search?${params.toString()}` : "/search");
  }

  const groups = resultGroups(data?.results || [], category);
  const hasQuery = query.trim().length >= 2;

  return (
    <div className="space-y-5 fade-in-up">
      <Card className="overflow-hidden border-border/70">
        <CardContent className="p-0">
          <div className="border-b border-border/70 bg-muted/15 p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Authorized workspace search
                </div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Search every record you are allowed to see
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Search your cases, evidence, documents, deadlines, drafts, shared comments,
                  timeline events, and public lawyers from one focused place.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SearchStat label="Visible results" value={data?.count || 0} />
                <SearchStat label="Active filter" value={activeCategory.label} />
                <SearchStat label="Workspace" value={userRole.toLowerCase()} />
              </div>
            </div>
          </div>

          <form onSubmit={submitSearch} className="grid gap-3 p-5 sm:p-6 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 rounded-2xl pl-10 text-base"
                placeholder="Search cases, evidence, lawyers, documents..."
                aria-label="Search your workspace"
              />
            </div>
            <Button type="submit" className="h-12 rounded-2xl px-6" disabled={!query.trim()}>
              Search
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="border-t border-border/70 p-4 sm:p-5">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categoryConfig.map((item) => {
                const Icon = item.icon;
                const active = item.key === category;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => chooseCategory(item.key)}
                    className={`group min-w-[150px] rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-primary/35 bg-primary/10 text-foreground shadow-[0_16px_40px_hsl(var(--primary)/0.16)]"
                        : "border-border/70 bg-background/70 text-muted-foreground hover:border-primary/25 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <Badge variant={active ? "default" : "outline"}>{categoryTotal(data, item.key)}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!hasQuery ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-medium">Start with a keyword</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Type at least two characters to search across the records you can access.
              Try a party name, lawyer name, file title, city, deadline, or case category.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {loading && hasQuery ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching authorized records...
          </CardContent>
        </Card>
      ) : null}

      {!loading && hasQuery && data && !data.results.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <FolderSearch className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-medium">No matching records found</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Try a broader keyword or switch the filter back to All. Private records from other users
              are intentionally hidden from these results.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-5">
        {groups.map((group) => {
          const config = categoryConfig.find((item) => item.key === group.category);
          const Icon = config?.icon || FolderSearch;

          return (
            <section key={group.category} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-background">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{config?.label || toTitleCase(group.category)}</h3>
                    <p className="text-xs text-muted-foreground">{config?.description}</p>
                  </div>
                </div>
                <Badge variant="outline">{group.results.length}</Badge>
              </div>

              <div className="grid gap-3">
                {group.results.map((item) => (
                  <GlobalSearchResultCard key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function GlobalSearchResultCard({ item }: { item: GlobalSearchResult }) {
  const date = item.updatedAt || item.createdAt;

  return (
    <Card className="border-border/70 soft-hover">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={typeBadgeVariant[item.type] || "outline"}>{toTitleCase(item.type)}</Badge>
              {typeof item.score === "number" && item.score > 0 ? (
                <Badge variant="outline">Match {Math.round(item.score)}%</Badge>
              ) : null}
              {date ? <Badge variant="outline">{relativeDate(date)}</Badge> : null}
            </div>

            <h3 className="mt-3 text-lg font-semibold tracking-tight text-wrap-safe">{item.title}</h3>
            {item.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground text-wrap-safe">{item.subtitle}</p>
            ) : null}
            {item.caseTitle && item.type !== "CASE" ? (
              <p className="mt-1 text-xs text-muted-foreground text-wrap-safe">Case: {item.caseTitle}</p>
            ) : null}

            {item.snippet ? (
              <p className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground text-wrap-safe">
                {item.snippet}
              </p>
            ) : null}

            {item.tags?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.slice(0, 8).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={item.href}>
              Open
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}
