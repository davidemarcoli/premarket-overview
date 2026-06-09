"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent, CalendarImpact } from "@/lib/calendar";
import { eventInfo } from "@/lib/event-info";
import { formatDuration } from "@/lib/sessions";

type Props = {
  events: CalendarEvent[];
  /** Server-computed "now" so SSR and first client render match. */
  initialNowMs: number;
};

const IMPACT_TONE: Record<CalendarImpact, { dot: string; chip: string; label: string }> = {
  high: {
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
    label: "High",
  },
  medium: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    label: "Med",
  },
  low: {
    dot: "bg-sky-400",
    chip: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
    label: "Low",
  },
  holiday: {
    dot: "bg-zinc-400",
    chip: "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
    label: "Holiday",
  },
};

const SWISS_TIME = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const SWISS_DAY = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  weekday: "short",
  day: "2-digit",
  month: "short",
});

function isSameSwissDay(a: Date, b: Date): boolean {
  return SWISS_DAY.format(a) === SWISS_DAY.format(b);
}

export function CalendarStrip({ events, initialNowMs }: Props) {
  const [now, setNow] = useState<Date>(() => new Date(initialNowMs));
  const [expanded, setExpanded] = useState(false);
  const [showMedium, setShowMedium] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    return showMedium ? events : events.filter((e) => e.impact === "high");
  }, [events, showMedium]);

  const upcoming = useMemo(() => {
    const cutoff = now.getTime() - 30 * 60 * 1000;
    return filtered.filter((e) => new Date(e.date).getTime() >= cutoff);
  }, [filtered, now]);

  const remainingThisWeek = useMemo(() => {
    return events.filter(
      (e) =>
        e.impact === "high" && new Date(e.date).getTime() >= now.getTime() - 30 * 60 * 1000,
    ).length;
  }, [events, now]);

  const nextHigh = useMemo(() => {
    return events
      .filter(
        (e) =>
          e.impact === "high" && new Date(e.date).getTime() >= now.getTime(),
      )
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [events, now]);

  const totalMedium = events.filter((e) => e.impact === "medium").length;

  return (
    <section className="mt-6" suppressHydrationWarning>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200/70 dark:bg-zinc-900/60 dark:ring-zinc-800">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Economic calendar
          </h2>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            {expanded
              ? "Hide full week"
              : `Show full week (${remainingThisWeek} high-impact)`}
          </button>
        </div>

        {nextHigh && (
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl bg-rose-50/70 px-4 py-3 ring-1 ring-rose-200/70 dark:bg-rose-950/30 dark:ring-rose-900/50">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-[10px] font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">
                Next high-impact
              </span>
              <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {nextHigh.currency} · {nextHigh.title}
              </span>
              {(nextHigh.forecast || nextHigh.previous) && (
                <span className="hidden text-[11px] tabular-nums text-zinc-500 md:inline">
                  {nextHigh.forecast && <>F {nextHigh.forecast}</>}
                  {nextHigh.forecast && nextHigh.previous && <> · </>}
                  {nextHigh.previous && <>P {nextHigh.previous}</>}
                </span>
              )}
            </div>
            <div className="text-xs tabular-nums text-rose-700 dark:text-rose-300">
              in {formatDuration(new Date(nextHigh.date).getTime() - now.getTime())} ·{" "}
              {SWISS_TIME.format(new Date(nextHigh.date))} Swiss
            </div>
            <p className="basis-full text-xs text-zinc-600 dark:text-zinc-400">
              {(() => {
                const info = eventInfo(nextHigh.title);
                return (
                  <>
                    {info.what}{" "}
                    <span className="text-zinc-500 italic">
                      {info.hot}
                      {info.cool && ` ${info.cool}`}
                    </span>
                  </>
                );
              })()}
            </p>
          </div>
        )}

        {!nextHigh && (
          <div className="mt-3 rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500 ring-1 ring-zinc-200/70 dark:bg-zinc-950/60 dark:ring-zinc-800">
            No more high-impact releases this week. Calm tape ahead.
          </div>
        )}

        {expanded && (
          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={() => setShowMedium((v) => !v)}
              className="text-[11px] text-zinc-500 underline-offset-2 hover:underline"
            >
              {showMedium ? "High impact only" : `Show medium (+${totalMedium})`}
            </button>
          </div>
        )}

        {expanded && upcoming.length === 0 && (
          <div className="mt-2 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500 ring-1 ring-zinc-200/70 dark:bg-zinc-950/60 dark:ring-zinc-800">
            {showMedium
              ? "No more medium-or-high-impact releases scheduled this week."
              : "No more high-impact releases this week."}
          </div>
        )}

        {expanded && upcoming.length > 0 && (
          <ul className="mt-4 space-y-3">
            {upcoming.map((e, i) => {
              const eventAt = new Date(e.date);
              const tone = IMPACT_TONE[e.impact];
              const sameDay = isSameSwissDay(eventAt, now);
              const inMs = eventAt.getTime() - now.getTime();
              const isPast = inMs < 0;
              const isFirstOfDay =
                i === 0 ||
                !isSameSwissDay(eventAt, new Date(upcoming[i - 1].date));
              const info = eventInfo(e.title);
              const isHeadliner = info.tier === "headline";
              return (
                <li key={`${e.date}-${e.title}-${i}`}>
                  {isFirstOfDay && (
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      {sameDay ? "Today" : SWISS_DAY.format(eventAt)}
                    </div>
                  )}
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                      className={`inline-block h-2 w-2 shrink-0 translate-y-[2px] rounded-full ${tone.dot}`}
                    />
                    <span className="w-14 shrink-0 text-xs tabular-nums text-zinc-500">
                      {SWISS_TIME.format(eventAt)}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${tone.chip}`}
                    >
                      {e.currency}
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-sm ${
                        isHeadliner
                          ? "font-semibold text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {e.title}
                      {isHeadliner && (
                        <span className="ml-2 inline-block rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900">
                          Headliner
                        </span>
                      )}
                    </span>
                    {(e.forecast || e.previous) && (
                      <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">
                        {e.forecast && <span>F {e.forecast}</span>}
                        {e.forecast && e.previous && <span> · </span>}
                        {e.previous && <span>P {e.previous}</span>}
                      </span>
                    )}
                    <span
                      className={`w-20 shrink-0 text-right text-xs tabular-nums ${
                        isPast ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {isPast ? "just now" : `in ${formatDuration(inMs)}`}
                    </span>
                  </div>
                  <p className="ml-5 mt-1 pl-3 text-xs leading-relaxed text-zinc-500 border-l-2 border-zinc-200 dark:border-zinc-800">
                    {info.what}{" "}
                    <span className="italic">
                      {info.hot}
                      {info.cool && ` ${info.cool}`}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-[11px] text-zinc-400">
          Source: Forex Factory (Fair Economy) — cached 6h. Forecast / Previous
          shown when supplied. Interpretations are rules-of-thumb — the actual
          reaction depends on how much the print surprises vs the forecast.
        </p>
      </div>
    </section>
  );
}
