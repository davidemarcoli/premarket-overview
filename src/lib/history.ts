import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type HistoryPoint = { t: number; close: number };

export type HistorySeries = {
  symbol: string;
  points: HistoryPoint[];
  low: number | null;
  high: number | null;
};

const HISTORY_TTL_MS = 15 * 60 * 1000;
const LOOKBACK_DAYS = 30;

type CacheEntry = { fetchedAt: number; series: HistorySeries };
const cache = new Map<string, CacheEntry>();

async function fetchOne(symbol: string): Promise<HistorySeries> {
  // Pad a little so weekends / partial weeks don't leave us with <30 bars.
  const period1 = new Date(Date.now() - (LOOKBACK_DAYS + 14) * 24 * 60 * 60 * 1000);
  try {
    const res = (await yahooFinance.chart(
      symbol,
      { period1, interval: "1d" },
      { validateResult: false },
    )) as { quotes?: Array<{ date?: Date | string | number; close?: number | null }> };
    const bars = res?.quotes ?? [];
    const points: HistoryPoint[] = [];
    for (const b of bars) {
      if (b.close == null || !b.date) continue;
      const d = b.date instanceof Date ? b.date : new Date(b.date);
      points.push({ t: d.getTime(), close: b.close });
    }
    // Keep only the last LOOKBACK_DAYS calendar-days of data.
    const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const trimmed = points.filter((p) => p.t >= cutoff);
    const series = trimmed.length >= 2 ? trimmed : points;

    const closes = series.map((p) => p.close);
    return {
      symbol,
      points: series,
      low: closes.length ? Math.min(...closes) : null,
      high: closes.length ? Math.max(...closes) : null,
    };
  } catch (err) {
    console.error(`history fetch failed for ${symbol}`, err);
    return { symbol, points: [], low: null, high: null };
  }
}

export async function getHistorySeries(symbols: string[]): Promise<Map<string, HistorySeries>> {
  const now = Date.now();
  const stale: string[] = [];
  const result = new Map<string, HistorySeries>();

  for (const sym of symbols) {
    const entry = cache.get(sym);
    if (entry && now - entry.fetchedAt < HISTORY_TTL_MS) {
      result.set(sym, entry.series);
    } else {
      stale.push(sym);
    }
  }

  if (stale.length > 0) {
    const fetched = await Promise.all(stale.map(fetchOne));
    for (const series of fetched) {
      cache.set(series.symbol, { fetchedAt: now, series });
      result.set(series.symbol, series);
    }
  }

  return result;
}
