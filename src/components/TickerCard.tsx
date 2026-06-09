import type { Quote } from "@/lib/quotes";
import {
  formatChange,
  formatMarketState,
  formatPercent,
  formatPrice,
  formatTime,
} from "@/lib/format";
import { Sparkline } from "./Sparkline";
import { RangeBar } from "./RangeBar";

type Props = {
  quote: Quote;
};

export function TickerCard({ quote }: Props) {
  const { config } = quote;
  const pct = quote.changePercent;

  const direction = pct == null ? "flat" : pct > 0 ? "up" : pct < 0 ? "down" : "flat";

  const tone =
    direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : direction === "down"
      ? "text-rose-600 dark:text-rose-400"
      : "text-zinc-500";

  const ring =
    direction === "up"
      ? "ring-emerald-500/20"
      : direction === "down"
      ? "ring-rose-500/20"
      : "ring-zinc-500/10";

  const bar =
    direction === "up"
      ? "bg-emerald-500"
      : direction === "down"
      ? "bg-rose-500"
      : "bg-zinc-400";

  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "■";

  // bar width: clamp |pct| to 3% for a sane visual scale
  const magnitude = Math.min(Math.abs(pct ?? 0), 3) / 3;
  const barWidth = `${Math.max(magnitude * 100, 3)}%`;

  return (
    <div
      className={`group flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ${ring} transition hover:shadow-md dark:bg-zinc-900/60`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {quote.config.symbol}
          </div>
          <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {config.short}
          </div>
        </div>
        {quote.marketState && (
          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {formatMarketState(quote.marketState)}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatPrice(quote.price, config)}
        </div>
        <div className={`flex items-baseline gap-1 text-sm font-medium tabular-nums ${tone}`}>
          <span aria-hidden>{arrow}</span>
          <span>{formatPercent(pct)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 tabular-nums">
        <span>Δ {formatChange(quote.change, config)}</span>
        <span>Prev {formatPrice(quote.previousClose, config)}</span>
      </div>

      <div className="-mx-1 flex items-center">
        <Sparkline points={quote.history} width={240} height={36} className="w-full" />
      </div>

      <RangeBar
        low={quote.range30d.low}
        high={quote.range30d.high}
        current={quote.price}
        config={config}
      />

      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full ${bar} transition-all`}
          style={{ width: barWidth }}
        />
      </div>

      {quote.error && (
        <p className="text-xs text-amber-600">No data available</p>
      )}

      <details className="group/details mt-1">
        <summary className="cursor-pointer list-none text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          <span className="inline-flex items-center gap-1">
            <span className="transition group-open/details:rotate-90">▸</span>
            What does this mean?
          </span>
        </summary>
        <div className="mt-2 space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          <p>{config.description}</p>
          <p className="border-l-2 border-zinc-300 pl-2 italic dark:border-zinc-700">
            {config.interpretation}
          </p>
          <div className="flex justify-between text-[10px] uppercase tracking-wide text-zinc-400">
            <span>Day {formatPrice(quote.dayLow, config)} – {formatPrice(quote.dayHigh, config)}</span>
            <span>Last {formatTime(quote.marketTime)}</span>
          </div>
        </div>
      </details>
    </div>
  );
}
