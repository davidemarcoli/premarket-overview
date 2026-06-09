import type { TickerConfig } from "./tickers";

const numberFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerLikeFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const percentFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(
  value: number | null,
  config: TickerConfig,
): string {
  if (value == null) return "—";
  if (config.unit === "percent") return `${percentFmt.format(value)}%`;
  if (config.unit === "usd") {
    if (value >= 1000) return `$${integerLikeFmt.format(value)}`;
    return `$${numberFmt.format(value)}`;
  }
  return numberFmt.format(value);
}

export function formatChange(
  change: number | null,
  config: TickerConfig,
): string {
  if (change == null) return "—";
  const sign = change > 0 ? "+" : "";
  if (config.unit === "percent") return `${sign}${(change).toFixed(2)} pp`;
  return `${sign}${numberFmt.format(change)}`;
}

export function formatPercent(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${percentFmt.format(value)}%`;
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich",
  });
}

export function formatMarketState(state: string | null): string {
  if (!state) return "";
  switch (state) {
    case "PRE":
      return "Pre-market";
    case "REGULAR":
      return "Open";
    case "POST":
      return "After-hours";
    case "POSTPOST":
      return "After-hours";
    case "PREPRE":
      return "Pre-market";
    case "CLOSED":
      return "Closed";
    default:
      return state;
  }
}
