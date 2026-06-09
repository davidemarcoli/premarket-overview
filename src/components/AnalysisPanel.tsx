"use client";

import { useEffect, useState } from "react";
import type { Analysis, GroundingSource } from "@/lib/analyze";

type Cached = {
  analysis: Analysis;
  generatedAt: string;
  latencyMs: number;
  fresh: boolean;
  provider?: "gemini" | "deepseek";
  sources?: GroundingSource[];
  searchQueries?: string[];
};

type BaseFields = {
  analysis: Analysis;
  generatedAt: string;
  latencyMs: number;
  provider: "gemini" | "deepseek";
  sources?: GroundingSource[];
  searchQueries?: string[];
};

type GetResponse =
  | { ok: true; cached: false }
  | ({ ok: true; cached: true; fresh: boolean } & BaseFields)
  | { ok: false; error: string };

type PostResponse =
  | ({ ok: true; cached: false; fresh: true } & BaseFields)
  | { ok: false; error: string };

function relative(from: Date, to: Date): string {
  const diff = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ago`;
}

const SWISS_TIME = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  hour: "2-digit",
  minute: "2-digit",
});

export function AnalysisPanel() {
  const [cached, setCached] = useState<Cached | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        cache: "no-store",
      });
      const data = (await res.json()) as PostResponse;
      if (!data.ok) throw new Error(data.error);
      setCached({
        analysis: data.analysis,
        generatedAt: data.generatedAt,
        latencyMs: data.latencyMs,
        fresh: true,
        provider: data.provider,
        sources: data.sources,
        searchQueries: data.searchQueries,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate analysis");
    } finally {
      setLoading(false);
    }
  };

  // On mount: read server cache. If we got a fresh cached analysis, show it.
  // If the cache is missing or stale (>10 min, beyond the route's TTL), POST
  // automatically — the server-side cache + in-flight coalescing keeps this
  // bounded to at most one real generation per 10-min window across all tabs.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    (async () => {
      let hadCache = false;
      let cacheFresh = false;
      try {
        const res = await fetch("/api/analyze", { cache: "no-store" });
        const data = (await res.json()) as GetResponse;
        if (data.ok && "cached" in data && data.cached) {
          hadCache = true;
          cacheFresh = data.fresh;
          setCached({
            analysis: data.analysis,
            generatedAt: data.generatedAt,
            latencyMs: data.latencyMs,
            fresh: data.fresh,
            provider: data.provider,
            sources: data.sources,
            searchQueries: data.searchQueries,
          });
        }
      } catch {
        // Silent: cached read is best-effort.
      }
      if (!hadCache || !cacheFresh) {
        // Fire-and-forget; generate() manages its own loading state.
        void generate();
      }
    })();
    return () => clearInterval(id);
  }, []);

  const handleGenerate = generate;

  const generatedAt = cached ? new Date(cached.generatedAt) : null;
  const ageLabel = generatedAt && now ? relative(generatedAt, now) : null;

  // Visual freshness cue: green <15m, amber <2h, zinc otherwise.
  const ageTone =
    !generatedAt || !now
      ? "text-zinc-400"
      : now.getTime() - generatedAt.getTime() < 15 * 60 * 1000
      ? "text-emerald-600 dark:text-emerald-400"
      : now.getTime() - generatedAt.getTime() < 2 * 60 * 60 * 1000
      ? "text-amber-600 dark:text-amber-400"
      : "text-zinc-500";

  return (
    <section className="mt-6" suppressHydrationWarning>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200/70 dark:bg-zinc-900/60 dark:ring-zinc-800">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              AI synthesis
            </h2>
            <p className="text-xs text-zinc-500">
              AI read of the current market, based on recent news.
              Server-cached 10 min between regens.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {generatedAt && (
              <span className={`text-xs tabular-nums ${ageTone}`}>
                {SWISS_TIME.format(generatedAt)} · {ageLabel}
              </span>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {loading ? "Generating…" : cached ? "Regenerate" : "Generate analysis"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900">
            {error}
          </div>
        )}

        {!cached && !error && loading && (
          <div className="mt-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500 ring-1 ring-zinc-200/70 dark:bg-zinc-950/60 dark:ring-zinc-800">
            Generating first synthesis… ~10–15 seconds with grounded Gemma.
          </div>
        )}

        {!cached && !error && !loading && (
          <div className="mt-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500 ring-1 ring-zinc-200/70 dark:bg-zinc-950/60 dark:ring-zinc-800">
            Press <span className="font-medium">Generate analysis</span> for a
            three-paragraph synthesis of the current tape.
          </div>
        )}

        {cached && (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Section label="The setup" body={cached.analysis.setup} />
              <Section label="What's interesting" body={cached.analysis.interesting} />
              <Section label="What to watch" body={cached.analysis.watch} />
            </div>
            {cached.sources && cached.sources.length > 0 && (
              <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Sources
                  {cached.searchQueries && cached.searchQueries.length > 0 && (
                    <span className="ml-2 font-normal normal-case text-zinc-400">
                      (queries: {cached.searchQueries.join(", ")})
                    </span>
                  )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {cached.sources.map((s, i) => (
                    <li key={`${s.uri}-${i}`}>
                      <a
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        {s.title || new URL(s.uri).hostname.replace(/^www\./, "")}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {body}
      </p>
    </div>
  );
}
