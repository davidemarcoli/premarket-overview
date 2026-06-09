import type { Quote } from "./quotes";

/**
 * Approximate regional weights for Vanguard Total World (VT).
 * Source: Vanguard factsheet (rounded). Numbers are %s of NAV and don't sum
 * to 100 — the missing slice (~8%) is "regions we don't have a clean live
 * proxy for" (mostly Canada, EM ex-China/HK, frontier markets).
 *
 * For the projection we normalize the four covered regions to sum to 1.0 and
 * report what fraction of VT's market cap they represent ("modeled coverage").
 */
const VT_WEIGHTS = {
  us: 0.62,
  europe: 0.16,
  japan: 0.06,
  chinaHk: 0.08,
} as const;

const COVERED = VT_WEIGHTS.us + VT_WEIGHTS.europe + VT_WEIGHTS.japan + VT_WEIGHTS.chinaHk;

const NORMALIZED = {
  us: VT_WEIGHTS.us / COVERED,
  europe: VT_WEIGHTS.europe / COVERED,
  japan: VT_WEIGHTS.japan / COVERED,
  chinaHk: VT_WEIGHTS.chinaHk / COVERED,
};

export type VTContribution = {
  region: "US" | "Europe" | "Japan" | "China / HK";
  proxy: string;
  proxySymbol: string;
  weight: number; // normalized 0..1
  changePct: number | null;
  contribution: number | null; // weight × changePct, in percentage points
};

export type VTProjection = {
  projectedPct: number | null;
  coveredFraction: number; // % of VT modeled (e.g. 0.92)
  contributions: VTContribution[];
  /** What state is the US in? Determines whether this is "implied open" or "live tracking". */
  usState: string | null;
};

function bySymbol(quotes: Quote[]): Map<string, Quote> {
  const m = new Map<string, Quote>();
  for (const q of quotes) m.set(q.symbol, q);
  return m;
}

export function computeVTProjection(quotes: Quote[]): VTProjection {
  const m = bySymbol(quotes);
  const es = m.get("ES=F");
  const stoxx = m.get("^STOXX50E");
  const n225 = m.get("^N225");
  const hsi = m.get("^HSI");

  const rows: VTContribution[] = [
    {
      region: "US",
      proxy: "S&P 500 futures",
      proxySymbol: "ES=F",
      weight: NORMALIZED.us,
      changePct: es?.changePercent ?? null,
      contribution:
        es?.changePercent != null ? NORMALIZED.us * es.changePercent : null,
    },
    {
      region: "Europe",
      proxy: "Euro Stoxx 50",
      proxySymbol: "^STOXX50E",
      weight: NORMALIZED.europe,
      changePct: stoxx?.changePercent ?? null,
      contribution:
        stoxx?.changePercent != null
          ? NORMALIZED.europe * stoxx.changePercent
          : null,
    },
    {
      region: "Japan",
      proxy: "Nikkei 225",
      proxySymbol: "^N225",
      weight: NORMALIZED.japan,
      changePct: n225?.changePercent ?? null,
      contribution:
        n225?.changePercent != null
          ? NORMALIZED.japan * n225.changePercent
          : null,
    },
    {
      region: "China / HK",
      proxy: "Hang Seng",
      proxySymbol: "^HSI",
      weight: NORMALIZED.chinaHk,
      changePct: hsi?.changePercent ?? null,
      contribution:
        hsi?.changePercent != null ? NORMALIZED.chinaHk * hsi.changePercent : null,
    },
  ];

  const haveAll = rows.every((r) => r.contribution != null);
  const projectedPct = haveAll
    ? rows.reduce((acc, r) => acc + (r.contribution ?? 0), 0)
    : null;

  return {
    projectedPct,
    coveredFraction: COVERED,
    contributions: rows,
    usState: es?.marketState ?? null,
  };
}

export function vtHeadlineFor(usState: string | null): string {
  switch (usState) {
    case "REGULAR":
      return "Implied vs. prior close";
    case "PRE":
    case "PREPRE":
      return "Projected open vs. prior close";
    case "POST":
    case "POSTPOST":
      return "Today's close vs. prior close (model)";
    default:
      return "Projected change vs. prior close";
  }
}
