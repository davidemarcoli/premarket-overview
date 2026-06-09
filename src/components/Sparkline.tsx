import type { HistoryPoint } from "@/lib/history";

type Props = {
  points: HistoryPoint[];
  width?: number;
  height?: number;
  /** Color tone: positive net change is green, negative is red, flat is zinc. */
  tone?: "auto" | "up" | "down" | "flat";
  className?: string;
};

export function Sparkline({
  points,
  width = 140,
  height = 36,
  tone = "auto",
  className,
}: Props) {
  if (points.length < 2) {
    return (
      <div
        className={`flex items-center justify-center text-[10px] text-zinc-400 ${className ?? ""}`}
        style={{ width, height }}
      >
        no history
      </div>
    );
  }

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;

  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  // Leave a 2px breathing room top/bottom so the stroke doesn't clip.
  const pad = 2;
  const usableH = height - pad * 2;

  const toY = (v: number) => pad + (1 - (v - min) / span) * usableH;

  const pathD = points
    .map((p, i) => {
      const x = i * stepX;
      const y = toY(p.close);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const lastX = (points.length - 1) * stepX;
  const lastY = toY(points[points.length - 1].close);

  const resolvedTone =
    tone === "auto"
      ? points[points.length - 1].close > points[0].close
        ? "up"
        : points[points.length - 1].close < points[0].close
        ? "down"
        : "flat"
      : tone;

  const stroke =
    resolvedTone === "up"
      ? "stroke-emerald-500"
      : resolvedTone === "down"
      ? "stroke-rose-500"
      : "stroke-zinc-400";

  const fill =
    resolvedTone === "up"
      ? "fill-emerald-500/10"
      : resolvedTone === "down"
      ? "fill-rose-500/10"
      : "fill-zinc-400/10";

  // Area fill underneath the line
  const areaD = `${pathD} L${lastX.toFixed(2)} ${height} L0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <path d={areaD} className={fill} />
      <path
        d={pathD}
        className={stroke}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2} className={stroke.replace("stroke-", "fill-")} />
    </svg>
  );
}
