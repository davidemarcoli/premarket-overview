export type TickerCategory =
  | "us-futures"
  | "rates"
  | "volatility"
  | "commodities"
  | "fx"
  | "intl-indices"
  | "crypto"
  | "holdings";

export type TickerDirection = "risk-on-up" | "risk-on-down" | "neutral";

export type TickerConfig = {
  symbol: string;
  name: string;
  short: string;
  category: TickerCategory;
  /**
   * What does it MEAN when the value goes UP?
   * `risk-on-up` → up = risk-on (equities tend to follow up)
   * `risk-on-down` → up = risk-off (equities tend to fall)
   * `neutral` → not a directional risk gauge
   */
  direction: TickerDirection;
  /** Weight used in the aggregate sentiment summary (0 = excluded). */
  weight: number;
  /** Short explanation of what this instrument tracks. */
  description: string;
  /** What a move means for the broader market. */
  interpretation: string;
  /** Display unit (% suffix for yields, $ for others, etc.). */
  unit?: "percent" | "usd" | "raw";
};

export const TICKERS: TickerConfig[] = [
  // US futures - the headline number for the open
  {
    symbol: "ES=F",
    name: "S&P 500 E-mini Futures",
    short: "S&P 500",
    category: "us-futures",
    direction: "risk-on-up",
    weight: 3,
    description:
      "Futures contract on the S&P 500. Trades nearly 24/5 and is the single best gauge for how the US large-cap open will look.",
    interpretation:
      "Green = bullish open expected. Red = bearish open. A move of ±0.5% before the bell is meaningful; ±1% is large.",
  },
  {
    symbol: "NQ=F",
    name: "Nasdaq-100 E-mini Futures",
    short: "Nasdaq 100",
    category: "us-futures",
    direction: "risk-on-up",
    weight: 2,
    description:
      "Futures contract on the Nasdaq-100. Tech-heavy, so it reacts strongly to interest rates and AI/semiconductor news.",
    interpretation:
      "Often leads ES on risk-on days (tech beta). If NQ is up much more than ES, growth/tech is in favour.",
  },
  {
    symbol: "YM=F",
    name: "Dow Jones E-mini Futures",
    short: "Dow",
    category: "us-futures",
    direction: "risk-on-up",
    weight: 1,
    description:
      "Futures on the Dow Jones Industrial Average. 30 large-cap, mostly value-oriented names.",
    interpretation:
      "If YM is green while NQ is red, money is rotating from growth into value/defensives.",
  },
  {
    symbol: "M2K=F",
    name: "Russell 2000 Micro Futures",
    short: "Russell 2000",
    category: "us-futures",
    direction: "risk-on-up",
    weight: 2,
    description:
      "Futures on the Russell 2000 small-cap index. Small caps are highly sensitive to US growth and credit conditions.",
    interpretation:
      "Small caps leading = broad risk-on, healthy breadth. Small caps lagging badly = narrow rally or recession fears.",
  },

  // Rates - the macro backdrop
  {
    symbol: "^TNX",
    name: "US 10-Year Treasury Yield",
    short: "US 10Y",
    category: "rates",
    direction: "risk-on-down",
    weight: 2,
    description:
      "Yield on the US 10-year Treasury note. The benchmark long rate that prices every other risk asset on the planet.",
    interpretation:
      "Rising yields pressure stocks (especially tech/long-duration). Falling yields are usually supportive — unless they fall on growth-scare flight to safety.",
    unit: "percent",
  },
  {
    symbol: "^TYX",
    name: "US 30-Year Treasury Yield",
    short: "US 30Y",
    category: "rates",
    direction: "risk-on-down",
    weight: 1,
    description:
      "Yield on the US 30-year Treasury bond. The very long end of the curve, watched for inflation and fiscal worries.",
    interpretation:
      "Steepening (30Y up faster than 2Y) signals reflation or fiscal stress. Flattening signals slowdown.",
    unit: "percent",
  },
  {
    symbol: "^IRX",
    name: "US 13-Week T-Bill Yield",
    short: "US 3M",
    category: "rates",
    direction: "neutral",
    weight: 0,
    description:
      "Short-term US T-Bill yield. Tracks the Fed Funds rate closely — your proxy for cash returns.",
    interpretation:
      "Mostly stable day-to-day. Big moves only happen around Fed meetings or sudden policy expectations.",
    unit: "percent",
  },

  // Volatility - the fear gauge
  {
    symbol: "^VIX",
    name: "CBOE Volatility Index",
    short: "VIX",
    category: "volatility",
    direction: "risk-on-down",
    weight: 3,
    description:
      "Expected 30-day volatility of the S&P 500 implied by options pricing. The market's 'fear gauge'.",
    interpretation:
      "<15 complacency, 15–20 normal, 20–30 elevated stress, >30 panic. A jump in VIX with futures already red confirms genuine risk-off.",
  },

  // Commodities
  {
    symbol: "CL=F",
    name: "WTI Crude Oil Futures",
    short: "WTI Oil",
    category: "commodities",
    direction: "neutral",
    weight: 1,
    description:
      "West Texas Intermediate crude oil front-month futures. Driver of inflation expectations and energy-sector earnings.",
    interpretation:
      "Spiking oil = inflation pressure + Fed dovishness gets harder. Falling oil = disinflationary, generally supportive of stocks (unless growth-scare driven).",
    unit: "usd",
  },
  {
    symbol: "GC=F",
    name: "Gold Futures",
    short: "Gold",
    category: "commodities",
    direction: "risk-on-down",
    weight: 1,
    description:
      "Gold front-month futures. Safe-haven asset; tends to rise when real yields fall or geopolitical stress rises.",
    interpretation:
      "Gold and stocks both up usually means weaker dollar / lower real yields. Gold ripping while stocks dump = flight to safety.",
    unit: "usd",
  },

  // FX
  {
    symbol: "DX-Y.NYB",
    name: "US Dollar Index (DXY)",
    short: "DXY",
    category: "fx",
    direction: "risk-on-down",
    weight: 2,
    description:
      "Trade-weighted basket of the USD against major currencies (mostly EUR, JPY, GBP, CAD, CHF, SEK).",
    interpretation:
      "Strong dollar = headwind for US multinationals' earnings, headwind for commodities, and pressure on emerging markets. Weak dollar = the opposite.",
  },
  {
    symbol: "EURUSD=X",
    name: "EUR / USD",
    short: "EUR/USD",
    category: "fx",
    direction: "neutral",
    weight: 0,
    description:
      "Largest FX pair by volume. Inverse of the DXY for most practical purposes.",
    interpretation:
      "Up = USD weakening. Helps your USD-denominated holdings translate to more CHF/EUR — and vice versa.",
  },
  {
    symbol: "USDCHF=X",
    name: "USD / CHF",
    short: "USD/CHF",
    category: "fx",
    direction: "neutral",
    weight: 0,
    description:
      "Number of CHF per 1 USD. Directly impacts the CHF value of your USD-denominated assets (e.g. VT).",
    interpretation:
      "Up = USD strengthening vs your home currency, so your VT is worth more in CHF terms (separate from VT's USD price action).",
  },

  // International indices (already-closed or trading-now sessions)
  {
    symbol: "^GSPC",
    name: "S&P 500 (cash index)",
    short: "S&P 500 cash",
    category: "intl-indices",
    direction: "risk-on-up",
    weight: 0,
    description:
      "The actual S&P 500 index level. During US RTH, this is the truth — futures are just an estimate of it.",
    interpretation:
      "Compare to ES=F to see the futures basis. Big divergences during US hours are rare and signal session ahead.",
  },
  {
    symbol: "^STOXX50E",
    name: "Euro Stoxx 50",
    short: "Euro Stoxx 50",
    category: "intl-indices",
    direction: "risk-on-up",
    weight: 1,
    description:
      "50 largest blue-chip eurozone stocks. Trades during European hours and sets the tone before the US open.",
    interpretation:
      "If Europe is strongly green/red before the US opens, US futures usually follow unless a US-specific catalyst is dominant.",
  },
  {
    symbol: "^N225",
    name: "Nikkei 225",
    short: "Nikkei 225",
    category: "intl-indices",
    direction: "risk-on-up",
    weight: 1,
    description:
      "Japan's headline index. Closes before Europe opens, so it's the first read on overnight risk sentiment.",
    interpretation:
      "A weak Nikkei often signals risk-off carrying over. Heavily affected by USD/JPY.",
  },
  {
    symbol: "^HSI",
    name: "Hang Seng Index",
    short: "Hang Seng",
    category: "intl-indices",
    direction: "risk-on-up",
    weight: 1,
    description:
      "Hong Kong's main index — your proxy for China sentiment when you don't want to deal with mainland indices.",
    interpretation:
      "Big moves often spill into commodities (especially copper, oil) and EM. Less directly relevant to S&P 500 day-to-day.",
  },

  // Crypto - the 24/7 risk barometer
  {
    symbol: "BTC-USD",
    name: "Bitcoin",
    short: "BTC",
    category: "crypto",
    direction: "risk-on-up",
    weight: 1,
    description:
      "Trades 24/7. The only major risk asset that prices over the weekend, so it's a useful Monday-morning sentiment input.",
    interpretation:
      "Strong correlation with Nasdaq in recent years. A weekend BTC dump often previews a soft Monday open for tech.",
    unit: "usd",
  },

  // Your holding
  {
    symbol: "VT",
    name: "Vanguard Total World Stock ETF",
    short: "VT",
    category: "holdings",
    direction: "risk-on-up",
    weight: 0,
    description:
      "Your main holding. ~60% US, ~40% ex-US. So US sentiment dominates but not exclusively.",
    interpretation:
      "VT only trades during US RTH, so before the open you can approximate today's expected move as roughly 0.6 × ES + 0.4 × international.",
    unit: "usd",
  },
];

export const CATEGORY_LABEL: Record<TickerCategory, string> = {
  "us-futures": "US Equity Futures",
  rates: "US Treasury Yields",
  volatility: "Volatility",
  commodities: "Commodities",
  fx: "Foreign Exchange",
  "intl-indices": "International Indices",
  crypto: "Crypto",
  holdings: "Your Holdings",
};

export const CATEGORY_ORDER: TickerCategory[] = [
  "us-futures",
  "volatility",
  "rates",
  "intl-indices",
  "fx",
  "commodities",
  "crypto",
  "holdings",
];

export const CATEGORY_DESCRIPTION: Record<TickerCategory, string> = {
  "us-futures":
    "Trades nearly 24/5 — your single best read of where the US cash open is heading. Watch the relative moves: NQ-vs-ES tells you growth-vs-value, M2K-vs-ES tells you breadth.",
  volatility:
    "The cost of S&P 500 option insurance. Rising VIX confirms genuine risk-off; falling VIX with green futures confirms genuine risk-on.",
  rates:
    "Treasury yields set the discount rate for every equity on earth. Big intraday yield moves (>5–10 bps on 10Y) usually drive an equity reaction in the opposite direction — especially for tech.",
  "intl-indices":
    "Asia closes before Europe opens before the US opens. They're your overnight read on global risk appetite before the US futures crowd is fully awake.",
  fx: "The dollar is the master variable for global liquidity. As a CHF-based investor in USD assets, FX moves directly change your wealth even when underlying prices don't.",
  commodities:
    "Oil prices feed straight into inflation expectations and the Fed reaction function. Gold is the cleanest read on real yields and macro stress.",
  crypto:
    "Trades 24/7. Mostly correlated with Nasdaq risk appetite in recent years; useful as a sentiment input outside of stock-market hours.",
  holdings:
    "Your own positions, shown for context. These will be stale outside US RTH.",
};
