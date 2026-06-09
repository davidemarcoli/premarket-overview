import YahooFinance from "yahoo-finance2";
import { TICKERS, type TickerConfig } from "./tickers";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type Quote = {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  marketState: string | null;
  currency: string | null;
  exchange: string | null;
  marketTime: string | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  /** Resolved against the matching TickerConfig for convenience on the client. */
  config: TickerConfig;
  error?: string;
};

export type QuotesPayload = {
  fetchedAt: string;
  quotes: Quote[];
};

type RawQuote = Record<string, unknown> & {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date | number | string;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketState?: string;
  currency?: string;
  fullExchangeName?: string;
  exchange?: string;
};

function toIsoMaybe(value: Date | number | string | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") {
    // Yahoo sometimes returns seconds-since-epoch, sometimes ms.
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function fetchQuotes(): Promise<QuotesPayload> {
  const symbols = TICKERS.map((t) => t.symbol);

  let raw: unknown;
  try {
    raw = await yahooFinance.quote(
      symbols,
      { return: "array" },
      { validateResult: false },
    );
  } catch (err) {
    console.error("yahoo-finance quote failed", err);
  }

  const list: RawQuote[] = Array.isArray(raw)
    ? (raw as RawQuote[])
    : raw
    ? [raw as RawQuote]
    : [];

  const bySymbol = new Map<string, RawQuote>();
  for (const q of list) {
    if (q?.symbol) bySymbol.set(q.symbol, q);
  }

  const quotes: Quote[] = TICKERS.map((config) => {
    const q = bySymbol.get(config.symbol);
    if (!q) {
      return {
        symbol: config.symbol,
        price: null,
        previousClose: null,
        change: null,
        changePercent: null,
        marketState: null,
        currency: null,
        exchange: null,
        marketTime: null,
        dayHigh: null,
        dayLow: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        config,
        error: "no_data",
      };
    }

    const price = q.regularMarketPrice ?? null;
    const previousClose = q.regularMarketPreviousClose ?? null;
    const change =
      q.regularMarketChange ??
      (price != null && previousClose != null ? price - previousClose : null);
    const changePercent =
      q.regularMarketChangePercent ??
      (price != null && previousClose != null && previousClose !== 0
        ? ((price - previousClose) / previousClose) * 100
        : null);

    return {
      symbol: config.symbol,
      price,
      previousClose,
      change,
      changePercent,
      marketState: q.marketState ?? null,
      currency: q.currency ?? null,
      exchange: q.fullExchangeName ?? q.exchange ?? null,
      marketTime: toIsoMaybe(q.regularMarketTime),
      dayHigh: q.regularMarketDayHigh ?? null,
      dayLow: q.regularMarketDayLow ?? null,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
      config,
    };
  });

  return {
    fetchedAt: new Date().toISOString(),
    quotes,
  };
}
