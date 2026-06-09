import type { SentimentScore } from "@/lib/sentiment";

type Props = {
  sentiment: SentimentScore;
};

export function SentimentBanner({ sentiment }: Props) {
  const { score, label, headline, drivers } = sentiment;

  const tone =
    score >= 15
      ? {
          bg: "from-emerald-500/10 via-emerald-500/5 to-transparent",
          text: "text-emerald-700 dark:text-emerald-300",
          dot: "bg-emerald-500",
          ring: "ring-emerald-500/30",
        }
      : score <= -15
      ? {
          bg: "from-rose-500/10 via-rose-500/5 to-transparent",
          text: "text-rose-700 dark:text-rose-300",
          dot: "bg-rose-500",
          ring: "ring-rose-500/30",
        }
      : {
          bg: "from-amber-400/10 via-amber-400/5 to-transparent",
          text: "text-amber-700 dark:text-amber-300",
          dot: "bg-amber-500",
          ring: "ring-amber-500/30",
        };

  const meterPercent = ((score + 100) / 200) * 100;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tone.bg} p-6 ring-1 ${tone.ring} dark:bg-zinc-900/40`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <span className={`inline-block h-2 w-2 rounded-full ${tone.dot}`} />
            Aggregate sentiment
          </div>
          <div className={`mt-1 text-3xl font-semibold ${tone.text}`}>{label}</div>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            {headline}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Score</div>
          <div className={`text-3xl font-semibold tabular-nums ${tone.text}`}>
            {score > 0 ? `+${score}` : score}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800/70">
          <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-400/60" />
          <div
            className={`absolute inset-y-0 ${tone.dot}`}
            style={{
              left: `${Math.min(meterPercent, 50)}%`,
              width: `${Math.abs(meterPercent - 50)}%`,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-zinc-400">
          <span>Risk-off</span>
          <span>Neutral</span>
          <span>Risk-on</span>
        </div>
      </div>

      {drivers.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Top drivers
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {drivers.map((d) => (
              <li
                key={d}
                className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:text-zinc-300 dark:ring-zinc-700"
              >
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
