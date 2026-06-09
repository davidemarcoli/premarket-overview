import type { Insight, InsightSeverity } from "@/lib/insights";

type Props = {
  insights: Insight[];
};

const TONE: Record<InsightSeverity, { dot: string; chip: string; ring: string; label: string }> = {
  alert: {
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
    ring: "ring-rose-500/20",
    label: "Alert",
  },
  watch: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    ring: "ring-amber-500/20",
    label: "Watch",
  },
  info: {
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
    ring: "ring-sky-500/20",
    label: "Note",
  },
};

export function InsightPanel({ insights }: Props) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Signals &amp; Divergences
        </h2>
        <span className="text-xs text-zinc-500">
          {insights.length === 0 ? "none firing" : `${insights.length} firing`}
        </span>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-xl bg-white p-4 text-sm text-zinc-500 ring-1 ring-zinc-200/70 dark:bg-zinc-900/60 dark:ring-zinc-800">
          Quiet tape — no rules are firing right now. That itself is a signal: nothing
          unusual in the cross-asset picture.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {insights.map((i) => {
            const tone = TONE[i.severity];
            return (
              <li
                key={i.id}
                className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${tone.ring} dark:bg-zinc-900/60`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${tone.chip}`}
                      >
                        {tone.label}
                      </span>
                      {i.tickers.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {i.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {i.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
