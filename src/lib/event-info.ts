/**
 * Pattern-matched explanations for common economic-calendar event titles.
 *
 * `tier` lets the UI filter: "headline" releases are the ones that genuinely
 * move every asset class on the planet; "important" matter but only sometimes;
 * "routine" are background noise unless they print way off forecast.
 *
 * Ordering of patterns matters — more specific patterns must come first.
 */

export type EventTier = "headline" | "important" | "routine";

export type EventInfo = {
  /** What is this number, in one phrase. */
  what: string;
  /**
   * What it means when the print is hotter / higher / stronger than expected
   * (vs the forecast). For non-directional events (speeches, holidays), put
   * a single takeaway here.
   */
  hot: string;
  /** What a cooler / lower / weaker print means. Omit if non-directional. */
  cool?: string;
  tier: EventTier;
};

type Pattern = { match: (lower: string) => boolean; info: EventInfo };

function has(...needles: string[]): (lower: string) => boolean {
  return (lower) => needles.every((n) => lower.includes(n));
}
function anyOf(...needles: string[]): (lower: string) => boolean {
  return (lower) => needles.some((n) => lower.includes(n));
}

const PATTERNS: Pattern[] = [
  // ---- Fed / FOMC ---------------------------------------------------------
  {
    match: has("federal funds rate"),
    info: {
      what: "Fed interest-rate decision.",
      hot: "Higher (or hawkish-hold) = pressure on stocks, dollar up, yields up.",
      cool: "Lower (or dovish) = stocks rally, yields drop.",
      tier: "headline",
    },
  },
  {
    match: anyOf("fomc economic projections", "fomc projections", "summary of economic projections"),
    info: {
      what: "Fed's quarterly dot-plot + macro forecasts.",
      hot: "Higher dots / inflation revs = hawkish surprise, stocks sell off.",
      cool: "Lower dots / softer outlook = dovish surprise, risk-on.",
      tier: "headline",
    },
  },
  {
    match: anyOf("fomc statement", "fomc press conference", "fomc minutes"),
    info: {
      what: "Fed policy communication.",
      hot: "Hawkish language (sticky inflation, higher-for-longer) = stocks down.",
      cool: "Dovish tilt (cuts on the table) = stocks up, yields down.",
      tier: "headline",
    },
  },
  {
    match: anyOf("fed chair powell", "powell speak", "powell speech"),
    info: {
      what: "Fed Chair Powell remarks.",
      hot: "Any policy hints move the entire curve and S&P.",
      tier: "headline",
    },
  },
  {
    match: has("fed", "speak"),
    info: {
      what: "FOMC member speech.",
      hot: "Hawkish lean nudges yields up. Voting members > non-voters.",
      cool: "Dovish lean nudges yields down.",
      tier: "important",
    },
  },

  // ---- ECB ----------------------------------------------------------------
  {
    match: anyOf("main refinancing rate", "ecb rate decision", "deposit facility rate"),
    info: {
      what: "ECB interest-rate decision.",
      hot: "Hawkish = EUR up, European stocks down.",
      cool: "Dovish = EUR down, European stocks up.",
      tier: "headline",
    },
  },
  {
    match: anyOf("ecb press conference", "ecb monetary policy", "lagarde"),
    info: {
      what: "ECB communication / Lagarde remarks.",
      hot: "Hawkish guidance lifts EUR and bunds.",
      cool: "Dovish guidance pressures EUR.",
      tier: "important",
    },
  },
  {
    match: has("monetary policy statement"),
    info: {
      what: "Central-bank policy statement.",
      hot: "Hawkish language = currency up, local stocks down.",
      cool: "Dovish language = currency down, local stocks up.",
      tier: "important",
    },
  },

  // ---- BOE ----------------------------------------------------------------
  {
    match: anyOf("official bank rate", "boe rate decision", "monetary policy summary"),
    info: {
      what: "Bank of England interest-rate decision.",
      hot: "Hawkish = GBP up, FTSE down.",
      cool: "Dovish = GBP down, FTSE up.",
      tier: "headline",
    },
  },
  {
    match: anyOf("mpc official", "mpc vote", "mpc meeting minutes", "boe press conference"),
    info: {
      what: "BoE vote split / press conference.",
      hot: "More dissenters voting for hikes = hawkish surprise, GBP up.",
      cool: "More voting for cuts = dovish, GBP down.",
      tier: "important",
    },
  },

  // ---- SNB (relevant for CHF holder) --------------------------------------
  {
    match: anyOf("snb policy rate", "snb monetary policy", "snb press conference"),
    info: {
      what: "Swiss National Bank policy decision.",
      hot: "Surprise hike / hawkish hold = CHF up, SMI down. Directly affects your USD/CHF exposure.",
      cool: "Surprise cut / FX intervention = CHF down, USD wins translate to more CHF.",
      tier: "headline",
    },
  },

  // ---- US inflation -------------------------------------------------------
  {
    match: has("core cpi"),
    info: {
      what: "US consumer-price inflation excluding food & energy.",
      hot: "Hotter print = Fed stays restrictive, stocks down, yields up. The Fed watches this more than headline CPI.",
      cool: "Cooler print = rate-cut hopes return, big risk-on move.",
      tier: "headline",
    },
  },
  {
    match: has("cpi") && (has("cpi", "y/y") || has("cpi", "m/m") || has("cpi", "release")),
    info: {
      what: "Consumer-price inflation (headline).",
      hot: "Hotter = inflation worries return, stocks sell off, currency up.",
      cool: "Cooler = disinflation narrative wins, stocks rally.",
      tier: "headline",
    },
  },
  {
    match: (l) => l.includes("cpi") && !l.includes("ppi"),
    info: {
      what: "Consumer-price inflation.",
      hot: "Hotter = central bank stays restrictive, stocks down.",
      cool: "Cooler = rate-cut hopes, stocks up.",
      tier: "headline",
    },
  },
  {
    match: has("core ppi"),
    info: {
      what: "US producer-price inflation excluding food & energy.",
      hot: "Hotter = pipeline inflation pressure, CPI follow-through likely.",
      cool: "Cooler = disinflation in the supply chain.",
      tier: "important",
    },
  },
  {
    match: has("ppi"),
    info: {
      what: "US producer-price inflation.",
      hot: "Hotter = upstream inflation pressure.",
      cool: "Cooler = disinflation pressure.",
      tier: "important",
    },
  },
  {
    match: has("core pce"),
    info: {
      what: "The Fed's preferred inflation gauge (PCE ex-food & energy).",
      hot: "Hotter = Fed will not cut soon, equities pressured.",
      cool: "Cooler = rate-cut bid, risk-on.",
      tier: "headline",
    },
  },
  {
    match: has("pce"),
    info: {
      what: "Personal consumption expenditures price index.",
      hot: "Hotter = inflation worries return.",
      cool: "Cooler = disinflation tailwind for stocks.",
      tier: "important",
    },
  },

  // ---- US labor -----------------------------------------------------------
  {
    match: anyOf("non-farm employment", "nonfarm employment", "non-farm payroll", "nonfarm payroll"),
    info: {
      what: "Net jobs added in the US ex-agriculture (NFP).",
      hot: "Hot = strong economy but Fed stays restrictive, mixed for stocks. Watch wage growth in the same release.",
      cool: "Cool = rate-cut bid, but a *very* weak print signals recession (bad for stocks too).",
      tier: "headline",
    },
  },
  {
    match: anyOf("adp non-farm", "adp nonfarm", "adp employment"),
    info: {
      what: "Private-sector job gains — preview of NFP two days later.",
      hot: "Hot ADP = market positions for hot NFP.",
      cool: "Weak ADP = rate-cut bid into NFP.",
      tier: "important",
    },
  },
  {
    match: has("unemployment rate"),
    info: {
      what: "Share of labor force without a job.",
      hot: "Higher = Fed has room to cut, but signals slowdown.",
      cool: "Lower = tight labor market, sticky wages, sticky inflation.",
      tier: "headline",
    },
  },
  {
    match: anyOf("average hourly earnings", "wage growth"),
    info: {
      what: "Wage growth.",
      hot: "Hot = sticky inflation, Fed stays restrictive.",
      cool: "Cool = supports disinflation narrative.",
      tier: "important",
    },
  },
  {
    match: anyOf("unemployment claims", "initial jobless claims"),
    info: {
      what: "Weekly count of new unemployment filings.",
      hot: "Higher = labor market softening (rate-cut bid).",
      cool: "Lower = labor market stays tight.",
      tier: "routine",
    },
  },
  {
    match: anyOf("jolts", "job openings"),
    info: {
      what: "Open job postings (labor demand).",
      hot: "Higher = tight labor market, hawkish.",
      cool: "Lower = cooling labor market, dovish.",
      tier: "important",
    },
  },
  {
    match: has("challenger job cuts"),
    info: {
      what: "Announced layoffs.",
      hot: "Higher = labor stress building.",
      cool: "Lower = labor market resilient.",
      tier: "routine",
    },
  },

  // ---- US growth ----------------------------------------------------------
  {
    match: anyOf("advance gdp", "preliminary gdp", "final gdp", "gdp price index", "gdp q/q", "gdp m/m", "gdp y/y", "gdp"),
    info: {
      what: "Real economic growth.",
      hot: "Hot growth + sticky inflation = no cuts, stocks mixed.",
      cool: "Cool growth = recession fears (bad) or rate-cut hopes (good) depending on the level.",
      tier: "headline",
    },
  },
  {
    match: has("retail sales"),
    info: {
      what: "Consumer spending.",
      hot: "Hot = consumer holding up, stocks supportive but Fed stays restrictive.",
      cool: "Cool = demand softening, recession risk creeps in.",
      tier: "headline",
    },
  },
  {
    match: anyOf("ism manufacturing", "ism services", "ism non-manufacturing"),
    info: {
      what: "ISM business-activity survey (50 = expansion line).",
      hot: "Above 50 and rising = economy expanding, supportive for cyclicals.",
      cool: "Below 50 = contraction; persistent sub-50 readings = recession signal.",
      tier: "headline",
    },
  },
  {
    match: anyOf("flash manufacturing pmi", "flash services pmi", "flash composite pmi"),
    info: {
      what: "S&P Global flash PMI (first read of the month, 50 = expansion).",
      hot: "Above 50 and improving = growth on track.",
      cool: "Sub-50 contraction = growth fears.",
      tier: "important",
    },
  },
  {
    match: anyOf("manufacturing pmi", "services pmi", "composite pmi"),
    info: {
      what: "Business-activity survey (50 = expansion).",
      hot: "Above 50 and rising = expansion.",
      cool: "Below 50 = contraction.",
      tier: "important",
    },
  },
  {
    match: has("industrial production"),
    info: {
      what: "Output from manufacturing, mining and utilities.",
      hot: "Hot = strong cyclical demand.",
      cool: "Cool = manufacturing slowdown.",
      tier: "routine",
    },
  },
  {
    match: has("durable goods"),
    info: {
      what: "Orders for goods meant to last 3+ years.",
      hot: "Hot = capex coming, supportive for industrials.",
      cool: "Cool = capex pulling back, recessionary signal.",
      tier: "routine",
    },
  },

  // ---- US sentiment / housing --------------------------------------------
  {
    match: anyOf("cb consumer confidence", "consumer confidence"),
    info: {
      what: "Conference Board consumer-confidence index.",
      hot: "Higher = consumers willing to spend, supportive for retail names.",
      cool: "Lower = recession risk perception rising.",
      tier: "routine",
    },
  },
  {
    match: anyOf("uom consumer sentiment", "michigan consumer sentiment", "prelim uom consumer sentiment"),
    info: {
      what: "Michigan consumer sentiment.",
      hot: "Hot = consumers willing to spend.",
      cool: "Cool = recession risk perception rising.",
      tier: "important",
    },
  },
  {
    match: anyOf("uom inflation expectations", "michigan inflation expectations", "prelim uom inflation"),
    info: {
      what: "Michigan 1-yr inflation expectations (the Fed watches this closely).",
      hot: "Rising expectations = bad for stocks, Fed stays restrictive.",
      cool: "Falling expectations = supportive, rate-cut bid.",
      tier: "important",
    },
  },
  {
    match: anyOf("empire state", "ny empire"),
    info: {
      what: "NY Fed manufacturing survey.",
      hot: "Hot = regional manufacturing reviving.",
      cool: "Cool = regional manufacturing weak.",
      tier: "routine",
    },
  },
  {
    match: has("philly fed"),
    info: {
      what: "Philadelphia Fed manufacturing survey.",
      hot: "Hot = mid-Atlantic manufacturing strong.",
      cool: "Cool = manufacturing softness.",
      tier: "routine",
    },
  },
  {
    match: anyOf("new home sales", "existing home sales", "pending home sales", "housing starts", "building permits"),
    info: {
      what: "US housing-market activity.",
      hot: "Hot = rate-sensitive consumer is OK, supportive for cyclicals.",
      cool: "Cool = high rates choking demand, watch for spillover.",
      tier: "routine",
    },
  },

  // ---- Europe -------------------------------------------------------------
  {
    match: anyOf("flash eurozone cpi", "eurozone cpi flash", "eurozone cpi", "cpi flash estimate"),
    info: {
      what: "Eurozone consumer-price inflation.",
      hot: "Hot = ECB stays restrictive, EUR up.",
      cool: "Cool = ECB cut hopes, EUR down.",
      tier: "headline",
    },
  },
  {
    match: anyOf("german ifo", "ifo business climate"),
    info: {
      what: "Ifo business-climate survey for Germany.",
      hot: "Hot = European recovery hopes.",
      cool: "Cool = Eurozone slowdown deepening.",
      tier: "important",
    },
  },
  {
    match: anyOf("zew economic sentiment", "zew survey"),
    info: {
      what: "ZEW expectations survey of German financial analysts.",
      hot: "Hot = Germany / EZ outlook improving.",
      cool: "Cool = pessimism deepening.",
      tier: "important",
    },
  },
  {
    match: anyOf("german flash cpi", "german prelim cpi", "german cpi"),
    info: {
      what: "German CPI — biggest single input into Eurozone CPI.",
      hot: "Hot = bunds sell off, ECB stays hawkish.",
      cool: "Cool = ECB cut bid.",
      tier: "important",
    },
  },

  // ---- UK -----------------------------------------------------------------
  {
    match: anyOf("uk cpi", "cpi y/y") && (has("gbp") || has("uk")),
    info: {
      what: "UK consumer-price inflation.",
      hot: "Hot = BoE stays restrictive, GBP up.",
      cool: "Cool = BoE cut hopes, GBP down.",
      tier: "headline",
    },
  },
  {
    match: has("claimant count"),
    info: {
      what: "UK unemployment claims.",
      hot: "Higher = labor stress, dovish for BoE.",
      cool: "Lower = labor strength.",
      tier: "routine",
    },
  },

  // ---- Switzerland --------------------------------------------------------
  {
    match: (l) => l.includes("cpi") && (l.includes("chf") || l.includes("swiss")),
    info: {
      what: "Swiss consumer-price inflation.",
      hot: "Hot = SNB rate-cut path delayed, CHF up.",
      cool: "Cool = SNB has room to cut, CHF down.",
      tier: "important",
    },
  },

  // ---- Oil / OPEC ---------------------------------------------------------
  {
    match: anyOf("opec meeting", "opec-jmmc", "opec joint ministerial"),
    info: {
      what: "OPEC+ production policy meeting.",
      hot: "Production cuts announced = oil up, inflation expectations up.",
      cool: "Production increases = oil down, disinflationary.",
      tier: "important",
    },
  },

  // ---- Bond auctions ------------------------------------------------------
  {
    match: anyOf("10-y bond auction", "30-y bond auction", "5-y note auction", "7-y note auction", "3-y note auction", "bond auction", "note auction"),
    info: {
      what: "US Treasury auction.",
      hot: "Weak auction (high yield vs WI, low bid-cover) = yields jump, stocks down.",
      cool: "Strong auction = yields drop, stocks up.",
      tier: "routine",
    },
  },

  // ---- Misc ---------------------------------------------------------------
  {
    match: has("trade balance"),
    info: {
      what: "Net exports.",
      hot: "Wider surplus = strong external demand for that economy.",
      cool: "Wider deficit = weak external demand.",
      tier: "routine",
    },
  },
  {
    match: has("federal budget"),
    info: {
      what: "Federal-government budget balance.",
      hot: "Wider deficit = more Treasury issuance, yields up.",
      cool: "Smaller deficit = less issuance pressure.",
      tier: "routine",
    },
  },
];

const GENERIC: EventInfo = {
  what: "Macro release.",
  hot: "Watch the actual vs forecast — that's where the surprise (and the price action) comes from.",
  tier: "routine",
};

export function eventInfo(title: string): EventInfo {
  const lower = title.toLowerCase();
  for (const p of PATTERNS) {
    if (p.match(lower)) return p.info;
  }
  return GENERIC;
}
