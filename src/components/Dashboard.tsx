"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { QuotesPayload } from "@/lib/quotes";
import {
  CATEGORY_DESCRIPTION,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type TickerCategory,
} from "@/lib/tickers";
import { computeSentiment } from "@/lib/sentiment";
import { computeInsights } from "@/lib/insights";
import { TickerCard } from "./TickerCard";
import { SentimentBanner } from "./SentimentBanner";
import { InsightPanel } from "./InsightPanel";
import { SessionStrip } from "./SessionStrip";
import { VTProjection } from "./VTProjection";

const REFRESH_MS = 60_000;

type Props = {
  initial: QuotesPayload;
};

export function Dashboard({ initial }: Props) {
  const [payload, setPayload] = useState<QuotesPayload>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // forces "x seconds ago" to re-render
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as QuotesPayload;
      setPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const sentiment = useMemo(() => computeSentiment(payload.quotes), [payload]);
  const insights = useMemo(() => computeInsights(payload.quotes), [payload]);

  const grouped = useMemo(() => {
    const map = new Map<TickerCategory, QuotesPayload["quotes"]>();
    for (const q of payload.quotes) {
      const arr = map.get(q.config.category) ?? [];
      arr.push(q);
      map.set(q.config.category, arr);
    }
    return map;
  }, [payload]);

  const fetchedAgo = useMemo(() => {
    const diff = Math.max(
      0,
      Math.floor((Date.now() - new Date(payload.fetchedAt).getTime()) / 1000),
    );
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m ${diff % 60}s ago`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ago`;
  }, [payload.fetchedAt, tick]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Premarket Overview
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Live read on US futures, rates, vol, FX and global indices — built for
            a CHF-based, VT-heavy investor.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="tabular-nums" suppressHydrationWarning>
            Updated {mounted ? fetchedAgo : "…"}
          </span>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900">
          Last refresh failed: {error}. Showing previous data.
        </div>
      )}

      <SessionStrip />

      <SentimentBanner sentiment={sentiment} />

      <VTProjection quotes={payload.quotes} />

      <InsightPanel insights={insights} />

      <div className="mt-10 space-y-10">
        {CATEGORY_ORDER.map((cat) => {
          const quotes = grouped.get(cat);
          if (!quotes || quotes.length === 0) return null;
          return (
            <section key={cat}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {CATEGORY_LABEL[cat]}
                </h2>
              </div>
              <p className="mb-4 max-w-3xl text-sm text-zinc-500">
                {CATEGORY_DESCRIPTION[cat]}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {quotes.map((q) => (
                  <TickerCard key={q.symbol} quote={q} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
        <p>
          Data sourced from Yahoo Finance via <code>yahoo-finance2</code>. Auto-refresh
          every {REFRESH_MS / 1000}s. Interpretations are rules-of-thumb, not advice —
          you make your own calls.
        </p>
      </footer>
    </div>
  );
}
