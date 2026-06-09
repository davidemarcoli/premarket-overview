import { formatPrice } from "@/lib/format";
import type { TickerConfig } from "@/lib/tickers";

type Props = {
  low: number | null;
  high: number | null;
  current: number | null;
  config: TickerConfig;
};

export function RangeBar({ low, high, current, config }: Props) {
  if (low == null || high == null || current == null || high === low) {
    return null;
  }

  const positionRaw = ((current - low) / (high - low)) * 100;
  const position = Math.max(0, Math.min(100, positionRaw));
  const percentile = Math.round(position);

  const positionLabel =
    percentile <= 10
      ? "near 30d low"
      : percentile <= 33
      ? "lower third"
      : percentile <= 66
      ? "mid 30d range"
      : percentile <= 90
      ? "upper third"
      : "near 30d high";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-400">
        <span>30d</span>
        <span>{positionLabel}</span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-zinc-200/70 dark:bg-zinc-800/70">
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-900 dark:bg-zinc-100"
          style={{ left: `${position}%` }}
          aria-hidden
        />
      </div>
      <div className="flex justify-between text-[10px] tabular-nums text-zinc-500">
        <span>{formatPrice(low, config)}</span>
        <span>{formatPrice(high, config)}</span>
      </div>
    </div>
  );
}
