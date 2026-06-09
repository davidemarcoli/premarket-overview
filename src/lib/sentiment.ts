import type { Quote } from "./quotes";

export type SentimentScore = {
  /** -100 → max risk-off, +100 → max risk-on. */
  score: number;
  label: "Strong risk-off" | "Risk-off" | "Neutral" | "Risk-on" | "Strong risk-on";
  headline: string;
  drivers: string[];
};

const SCALE_PCT = 1.0; // 1% move on a weight-3 input = full contribution

export function computeSentiment(quotes: Quote[]): SentimentScore {
  let weightedSum = 0;
  let totalWeight = 0;

  const contributions: { label: string; impact: number; pct: number }[] = [];

  for (const q of quotes) {
    const { config } = q;
    if (config.weight <= 0) continue;
    if (q.changePercent == null) continue;

    const signed =
      config.direction === "risk-on-up"
        ? q.changePercent
        : config.direction === "risk-on-down"
        ? -q.changePercent
        : 0;
    if (signed === 0) continue;

    const normalized = Math.max(-1, Math.min(1, signed / SCALE_PCT));
    const contribution = normalized * config.weight;
    weightedSum += contribution;
    totalWeight += config.weight;

    contributions.push({
      label: config.short,
      impact: contribution,
      pct: q.changePercent,
    });
  }

  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

  let label: SentimentScore["label"];
  if (score >= 50) label = "Strong risk-on";
  else if (score >= 15) label = "Risk-on";
  else if (score <= -50) label = "Strong risk-off";
  else if (score <= -15) label = "Risk-off";
  else label = "Neutral";

  const top = [...contributions]
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 3);

  const drivers = top.map(
    (c) =>
      `${c.label} ${c.pct >= 0 ? "+" : ""}${c.pct.toFixed(2)}% ${
        c.impact > 0 ? "(risk-on)" : "(risk-off)"
      }`,
  );

  const headline = makeHeadline(label, top);

  return { score, label, headline, drivers };
}

function makeHeadline(
  label: SentimentScore["label"],
  top: { label: string; impact: number; pct: number }[],
): string {
  if (top.length === 0) return "No data yet.";

  const leader = top[0];
  const direction =
    leader.impact > 0 ? "pushing risk-on" : "weighing on risk appetite";

  switch (label) {
    case "Strong risk-on":
      return `Broad risk-on tape — ${leader.label} ${direction} the most.`;
    case "Risk-on":
      return `Modestly constructive — ${leader.label} is ${direction}.`;
    case "Strong risk-off":
      return `Clear risk-off setup — ${leader.label} ${direction}.`;
    case "Risk-off":
      return `Defensive lean — ${leader.label} is ${direction}.`;
    default:
      return `Mixed signals — biggest mover is ${leader.label} (${leader.pct >= 0 ? "+" : ""}${leader.pct.toFixed(2)}%).`;
  }
}
