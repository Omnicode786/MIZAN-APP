"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileSearch,
  FolderKanban,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/translations";
import { FormattedAiContent } from "@/utils/ai-content";
import { relativeDate, toTitleCase } from "@/lib/utils";

type SearchCase = {
  id: string;
  title: string;
  category: string;
  status: string;
  updatedAt: string | Date;
  _count?: {
    documents: number;
    evidenceItems: number;
  };
};

type SearchResult = {
  id: string;
  type: "DOCUMENT" | "EVIDENCE";
  title: string;
  caseId: string;
  caseTitle: string;
  caseCategory?: string;
  category?: string | null;
  createdAt: string | Date;
  tags?: string[];
  matchedFields?: string[];
  snippet?: string;
  summary?: string | null;
  confidence?: number | null;
  score?: number;
  linkedDocument?: {
    id: string;
    fileName: string;
    probableCategory?: string | null;
  } | null;
};

type SearchResponse = {
  query: string;
  count: number;
  totals: {
    documents: number;
    evidence: number;
  };
  results: SearchResult[];
};

export function SearchInvestigationPanel({ cases }: { cases: SearchCase[] }) {
  const language = useLanguage();
  const [query, setQuery] = useState("");
  const [caseId, setCaseId] = useState("all");
  const [scope, setScope] = useState<"ALL" | "DOCUMENTS" | "EVIDENCE">("ALL");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === caseId),
    [cases, caseId]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function runSearch() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify({
            query,
            caseId,
            scope,
            language
          })
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Search failed.");
        }

        setData(json);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Search failed.");
        }
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(runSearch, query.trim() ? 350 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, caseId, scope]);

  const results = data?.results || [];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-border/70">
        <CardContent className="p-0">
          <div className="border-b border-border/70 bg-muted/20 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                  <FileSearch className="h-3.5 w-3.5" />
                  Live database evidence search
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Investigation console
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Search across uploaded document names, extracted text, AI summaries,
                  evidence labels, searchable evidence text, categories, and tags.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SearchStat label="Cases" value={cases.length} />
                <SearchStat label="Documents" value={data?.totals.documents ?? 0} />
                <SearchStat label="Evidence" value={data?.totals.evidence ?? 0} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[1fr_220px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-10"
                placeholder={t(language, "searchPlaceholder")}
              />
            </div>

            <select
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
              className="h-10 rounded-2xl border border-border bg-background px-4 text-sm"
            >
              <option value="all">All accessible cases</option>
              {cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>

            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as any)}
              className="h-10 rounded-2xl border border-border bg-background px-4 text-sm"
            >
              <option value="ALL">All records</option>
              <option value="DOCUMENTS">Documents only</option>
              <option value="EVIDENCE">Evidence only</option>
            </select>
          </div>

          <div className="border-t border-border/70 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                {selectedCase ? selectedCase.title : "All cases"}
              </Badge>
              <Badge variant="secondary">{scope}</Badge>
              {query.trim() ? (
                <Badge variant="outline">Query: {query.trim()}</Badge>
              ) : (
                <Badge variant="outline">Showing recent records</Badge>
              )}
              {loading ? (
                <Badge variant="warning">
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Searching
                </Badge>
              ) : (
                <Badge variant="success">
                  <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                  {results.length} result{results.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!cases.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <FolderKanban className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-medium">No cases available</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Evidence search becomes active after you create or receive access to a case
              and upload documents or evidence.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {results.map((item) => (
          <SearchResultCard key={`${item.type}-${item.id}`} item={item} query={query} />
        ))}

        {!loading && cases.length > 0 && !results.length ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-medium">No matching evidence found</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                Try searching for a party name, payment amount, date, legal category,
                document type, notice, clause, threat, address, or extracted phrase.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function SearchResultCard({
  item,
  query
}: {
  item: SearchResult;
  query: string;
}) {
  return (
    <Card className="border-border/70 transition hover:shadow-lg">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={item.type === "DOCUMENT" ? "secondary" : "warning"}>
                {item.type}
              </Badge>

              {item.category ? (
                <Badge variant="outline">{toTitleCase(item.category)}</Badge>
              ) : null}

              {typeof item.confidence === "number" ? (
                <Badge variant="outline">
                  {Math.round(item.confidence * 100)}% confidence
                </Badge>
              ) : null}

              {typeof item.score === "number" && query.trim() ? (
                <Badge variant="success">Match {item.score}%</Badge>
              ) : null}
            </div>

            <h3 className="mt-3 text-lg font-semibold tracking-tight">
              {item.title}
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              Case: {item.caseTitle} · {item.caseCategory ? toTitleCase(item.caseCategory) : "Uncategorized"} ·{" "}
              {relativeDate(item.createdAt)}
            </p>

            {item.snippet ? (
              <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <FormattedAiContent content={item.snippet} />
              </div>
            ) : item.summary ? (
              <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <FormattedAiContent content={item.summary} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No searchable preview is available for this record yet.
              </p>
            )}

            {item.linkedDocument ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Linked document: {item.linkedDocument.fileName}
              </p>
            ) : null}

            {(item.matchedFields || []).length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {(item.matchedFields || []).map((field) => (
                  <Badge key={field} variant="outline">
                    matched: {field}
                  </Badge>
                ))}
              </div>
            ) : null}

            {(item.tags || []).length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {(item.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
            <Button asChild variant="outline" size="sm">
              <Link href={`/cases/${item.caseId}`}>
                Open case
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
