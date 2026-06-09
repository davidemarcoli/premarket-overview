import type { Quote } from "./quotes";

export type InsightSeverity = "info" | "watch" | "alert";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
  tickers: string[];
};

function bySymbol(quotes: Quote[]): Map<string, Quote> {
  const m = new Map<string, Quote>();
  for (const q of quotes) m.set(q.symbol, q);
  return m;
}

/** Absolute basis-point change in a yield (e.g. ^TNX). 1.0 = 100 bp. */
function bpChange(q: Quote | undefined): number | null {
  if (!q || q.price == null || q.previousClose == null) return null;
  // ^TNX is quoted in percent (e.g. 4.548 = 4.548%), so 0.01 = 1 bp.
  return (q.price - q.previousClose) * 100;
}

function pct(q: Quote | undefined): number | null {
  return q?.changePercent ?? null;
}

export function computeInsights(quotes: Quote[]): Insight[] {
  const m = bySymbol(quotes);
  const out: Insight[] = [];

  const es = m.get("ES=F");
  const nq = m.get("NQ=F");
  const m2k = m.get("M2K=F");
  const vix = m.get("^VIX");
  const tnx = m.get("^TNX");
  const dxy = m.get("DX-Y.NYB");
  const gold = m.get("GC=F");
  const oil = m.get("CL=F");
  const stoxx = m.get("^STOXX50E");
  const usdchf = m.get("USDCHF=X");
  const btc = m.get("BTC-USD");

  // ---- Rule 1: 10Y yield shock (>5 bp) ------------------------------------
  const bp10 = bpChange(tnx);
  if (bp10 != null && Math.abs(bp10) >= 5) {
    const up = bp10 > 0;
    out.push({
      id: "yield-shock",
      severity: Math.abs(bp10) >= 10 ? "alert" : "watch",
      title: `10Y yield ${up ? "+" : ""}${bp10.toFixed(1)} bp — material discount-rate move`,
      body: up
        ? "Higher yields raise the discount rate on every equity, with tech/long-duration names hit hardest. Watch NQ relative to ES."
        : "Lower yields are usually equity-supportive — unless they're falling on a growth scare (check VIX and small caps).",
      tickers: ["^TNX", "NQ=F", "ES=F"],
    });
  }

  // ---- Rule 2: Breadth — small caps lagging large caps badly --------------
  const esP = pct(es);
  const m2kP = pct(m2k);
  if (esP != null && m2kP != null) {
    const gap = m2kP - esP;
    if (Math.abs(gap) >= 0.5) {
      const small = gap > 0;
      out.push({
        id: "breadth",
        severity: Math.abs(gap) >= 1.0 ? "watch" : "info",
        title: `Small caps ${small ? "leading" : "lagging"} large caps by ${Math.abs(gap).toFixed(2)} pp`,
        body: small
          ? "Russell 2000 outperforming S&P futures — healthy breadth, risk-on under the surface."
          : "Small caps lagging means narrow rally or credit/growth concerns under the surface. A few mega-caps can mask a weak tape.",
        tickers: ["M2K=F", "ES=F"],
      });
    }
  }

  // ---- Rule 3: VIX divergence (both up = hedging the rally) ---------------
  const vixP = pct(vix);
  if (esP != null && vixP != null) {
    if (esP >= 0.3 && vixP >= 3) {
      out.push({
        id: "vix-divergence-up",
        severity: "watch",
        title: "ES up but VIX also up — option flows are hedging this rally",
        body: "Equities rising alongside implied volatility is unusual and often precedes a reversal. Someone is paying up for downside protection.",
        tickers: ["ES=F", "^VIX"],
      });
    } else if (esP <= -0.3 && vixP <= -3) {
      out.push({
        id: "vix-divergence-down",
        severity: "info",
        title: "ES down but VIX also down — selling is orderly",
        body: "Equities falling without a VIX bid means no panic. Usually rotation/profit-taking rather than a stress event.",
        tickers: ["ES=F", "^VIX"],
      });
    }
  }

  // ---- Rule 4: Risk-off cluster (3+ signs of flight to safety) ------------
  const riskOffSignals: string[] = [];
  if (pct(gold) != null && pct(gold)! >= 0.3) riskOffSignals.push("Gold bid");
  if (vixP != null && vixP >= 5) riskOffSignals.push("VIX spiking");
  if (bp10 != null && bp10 <= -3) riskOffSignals.push("Yields falling");
  if (pct(oil) != null && pct(oil)! <= -1) riskOffSignals.push("Oil dumping");
  if (esP != null && esP <= -0.3) riskOffSignals.push("Equities red");
  if (riskOffSignals.length >= 3) {
    out.push({
      id: "risk-off-cluster",
      severity: "alert",
      title: `Classic risk-off cluster — ${riskOffSignals.length} signals firing`,
      body: `${riskOffSignals.join(", ")}. The combination points to genuine flight-to-safety, not just rotation. Reduce gross exposure or hedge.`,
      tickers: ["GC=F", "^VIX", "^TNX", "CL=F", "ES=F"],
    });
  }

  // ---- Rule 5: Dollar shock (DXY move ≥0.4%) ------------------------------
  const dxyP = pct(dxy);
  if (dxyP != null && Math.abs(dxyP) >= 0.4) {
    const up = dxyP > 0;
    out.push({
      id: "dollar-shock",
      severity: Math.abs(dxyP) >= 0.8 ? "watch" : "info",
      title: `Dollar ${up ? "+" : ""}${dxyP.toFixed(2)}% — global liquidity event`,
      body: up
        ? "Stronger dollar pressures US multinational earnings, commodities, and emerging markets. Tighter global financial conditions."
        : "Weaker dollar eases conditions globally — supportive for commodities, EM and US large-cap earnings translation.",
      tickers: ["DX-Y.NYB"],
    });
  }

  // ---- Rule 6: Europe vs US disagreement (gap >0.6 pp) --------------------
  const stoxxP = pct(stoxx);
  if (stoxxP != null && esP != null) {
    const gap = stoxxP - esP;
    if (Math.abs(gap) >= 0.6) {
      const europeStronger = gap > 0;
      out.push({
        id: "europe-us-gap",
        severity: "info",
        title: `Europe ${europeStronger ? "leading" : "lagging"} the US by ${Math.abs(gap).toFixed(2)} pp`,
        body: europeStronger
          ? "Euro Stoxx clearly stronger than US futures — either a US-specific headwind is in play, or US futures will catch up at the open."
          : "US futures clearly stronger than European tape — US-specific catalyst (earnings, macro print) is dominating sentiment.",
        tickers: ["^STOXX50E", "ES=F"],
      });
    }
  }

  // ---- Rule 7: Tech leadership (NQ-ES gap) --------------------------------
  const nqP = pct(nq);
  if (nqP != null && esP != null) {
    const gap = nqP - esP;
    if (Math.abs(gap) >= 0.4) {
      const techLeading = gap > 0;
      out.push({
        id: "tech-rotation",
        severity: "info",
        title: `${techLeading ? "Tech leading" : "Value leading"} — NQ ${gap > 0 ? "+" : ""}${gap.toFixed(2)} pp vs ES`,
        body: techLeading
          ? "Growth/tech in favor today. Often correlates with lower yields and a softer dollar."
          : "Money rotating into value/defensives. Often correlates with rising yields or a 'risk-off-but-not-panicking' tape.",
        tickers: ["NQ=F", "ES=F"],
      });
    }
  }

  // ---- Rule 8: CHF FX wealth note (informational, for VT holder) ----------
  const chfP = pct(usdchf);
  if (chfP != null && Math.abs(chfP) >= 0.3) {
    const up = chfP > 0;
    out.push({
      id: "chf-fx",
      severity: "info",
      title: `USD/CHF ${up ? "+" : ""}${chfP.toFixed(2)}% — your VT changed in CHF before any equity move`,
      body: up
        ? "USD strengthened vs CHF. Your USD-denominated holdings are worth more in CHF terms today, independent of US stock action."
        : "USD weakened vs CHF. Your USD-denominated holdings are worth less in CHF terms today, even if US stocks are up.",
      tickers: ["USDCHF=X"],
    });
  }

  // ---- Rule 9: Weekend BTC tell (Mondays only) ----------------------------
  const btcP = pct(btc);
  const isMonday = new Date().getUTCDay() === 1;
  if (isMonday && btcP != null && Math.abs(btcP) >= 2) {
    const up = btcP > 0;
    out.push({
      id: "weekend-btc",
      severity: "info",
      title: `Weekend BTC ${up ? "rally" : "dump"}: ${up ? "+" : ""}${btcP.toFixed(2)}%`,
      body: up
        ? "BTC ran over the weekend — often previews a risk-on Monday for tech, since BTC is the only major risk asset that prices in stock-market off-hours."
        : "BTC sold off over the weekend — often previews tech weakness Monday; the BTC-Nasdaq correlation has been strong in recent years.",
      tickers: ["BTC-USD", "NQ=F"],
    });
  }

  // Stable ordering: alert > watch > info, then by id for determinism.
  const order: Record<InsightSeverity, number> = { alert: 0, watch: 1, info: 2 };
  out.sort((a, b) => order[a.severity] - order[b.severity] || a.id.localeCompare(b.id));

  return out;
}
