import type { Quote } from "@/lib/quotes";
import { computeVTProjection, vtHeadlineFor } from "@/lib/vt";

type Props = {
  quotes: Quote[];
};

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function toneOf(v: number | null) {
  if (v == null || v === 0)
    return { text: "text-zinc-500", bg: "bg-zinc-400", bar: "bg-zinc-300" };
  if (v > 0)
    return {
      text: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-500",
      bar: "bg-emerald-500/80",
    };
  return {
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500",
    bar: "bg-rose-500/80",
  };
}

export function VTProjection({ quotes }: Props) {
  const p = computeVTProjection(quotes);
  const vt = quotes.find((q) => q.symbol === "VT");

  const tone = toneOf(p.projectedPct);
  const headline = vtHeadlineFor(p.usState);

  // Max absolute contribution for scaling the per-row bar.
  const maxAbs = Math.max(
    ...p.contributions.map((c) => Math.abs(c.contribution ?? 0)),
    0.0001,
  );

  return (
    <section className="mt-6">
      <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200/70 dark:bg-zinc-900/60 dark:ring-zinc-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span className={`inline-block h-2 w-2 rounded-full ${tone.bg}`} />
              VT projection
            </div>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {headline}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-zinc-500">
              Weighted blend of the regions we can observe live (US futures,
              Euro Stoxx 50, Nikkei, Hang Seng). Modeled coverage:{" "}
              {(p.coveredFraction * 100).toFixed(0)}% of VT — the remaining slice
              is mostly Canada and EM ex-China.
            </p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-semibold tabular-nums ${tone.text}`}>
              {fmtPct(p.projectedPct)}
            </div>
            {vt?.changePercent != null && (
              <div className="text-xs text-zinc-500 tabular-nums">
                Yahoo VT print: {fmtPct(vt.changePercent)}
              </div>
            )}
          </div>
        </div>

        <ul className="mt-5 space-y-2">
          {p.contributions.map((c) => {
            const cTone = toneOf(c.contribution ?? 0);
            const widthPct =
              c.contribution == null
                ? 0
                : (Math.abs(c.contribution) / maxAbs) * 50; // 0..50 of the bar (centered)
            return (
              <li
                key={c.proxySymbol}
                className="flex items-center gap-3 text-sm tabular-nums"
              >
                <div className="w-28 shrink-0 text-zinc-700 dark:text-zinc-300">
                  {c.region}
                </div>
                <div className="w-12 shrink-0 text-right text-xs text-zinc-500">
                  {(c.weight * 100).toFixed(0)}%
                </div>
                <div className="relative h-2 flex-1 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-400/50" />
                  {c.contribution != null && (
                    <div
                      className={`absolute inset-y-0 ${cTone.bar} rounded-full`}
                      style={
                        c.contribution >= 0
                          ? { left: "50%", width: `${widthPct}%` }
                          : { right: "50%", width: `${widthPct}%` }
                      }
                    />
                  )}
                </div>
                <div className="w-20 shrink-0 text-right text-xs text-zinc-500">
                  {fmtPct(c.changePct)}
                </div>
                <div
                  className={`w-20 shrink-0 text-right text-xs font-medium ${cTone.text}`}
                >
                  {c.contribution != null
                    ? `${c.contribution >= 0 ? "+" : ""}${c.contribution.toFixed(2)} pp`
                    : "—"}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[11px] text-zinc-400">
          Contribution = region weight × region change. The big number is the
          sum — an estimate of where VT should print today vs. yesterday's
          close based on the regions trading right now.
        </p>
      </div>
    </section>
  );
}
