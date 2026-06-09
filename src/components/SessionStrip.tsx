"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SESSIONS,
  formatDuration,
  getSessionStatus,
  type SessionStatus,
} from "@/lib/sessions";

type Cell = {
  id: string;
  name: string;
  kind: "pre" | "regular" | "post";
  status: SessionStatus;
};

function classesFor(status: SessionStatus, kind: Cell["kind"]) {
  if (status.state === "open") {
    return {
      ring: "ring-emerald-500/40",
      dot: "bg-emerald-500",
      label: "text-emerald-700 dark:text-emerald-300",
      badge: "Open",
    };
  }
  if (status.state === "break") {
    return {
      ring: "ring-amber-500/40",
      dot: "bg-amber-500",
      label: "text-amber-700 dark:text-amber-300",
      badge: "Break",
    };
  }
  return {
    ring: "ring-zinc-300/60 dark:ring-zinc-700/60",
    dot: kind === "pre" ? "bg-sky-400" : "bg-zinc-400",
    label: "text-zinc-500",
    badge: "Closed",
  };
}

export function SessionStrip() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const cells: Cell[] = useMemo(() => {
    if (!now) return [];
    return SESSIONS.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      status: getSessionStatus(now, s),
    }));
  }, [now]);

  // Feature the next US-related event prominently for premarket users.
  const nyse = cells.find((c) => c.id === "nyse");
  const usPre = cells.find((c) => c.id === "us-pre");
  const featured = nyse?.status.state === "open" ? nyse : usPre ?? nyse;

  return (
    <section className="mb-6" suppressHydrationWarning>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200/70 dark:bg-zinc-900/60 dark:ring-zinc-800">
        {featured && now && (
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                {featured.id === "nyse" && featured.status.state === "open"
                  ? "US session"
                  : "Next US event"}
              </div>
              <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {featured.id === "nyse" && featured.status.state === "open"
                  ? `NYSE open — closes in ${formatDuration(featured.status.closesInMs)} (${featured.status.closesAtSwiss} Swiss)`
                  : usPre?.status.state === "open"
                  ? `US pre-market live — NYSE opens in ${formatDuration(
                      (nyse?.status.state === "closed" ? nyse.status.opensInMs : 0),
                    )} (${nyse?.status.state === "closed" ? nyse.status.opensAtSwiss : "—"} Swiss)`
                  : `${featured.name} opens in ${
                      featured.status.state === "closed"
                        ? formatDuration(featured.status.opensInMs)
                        : "—"
                    } (${
                      featured.status.state === "closed" ? featured.status.opensAtSwiss : "—"
                    } Swiss)`}
              </div>
            </div>
            <div className="text-xs text-zinc-500 tabular-nums">
              Now {new Intl.DateTimeFormat("de-CH", {
                timeZone: "Europe/Zurich",
                hour: "2-digit",
                minute: "2-digit",
              }).format(now)}{" "}
              Swiss
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {cells.map((c) => {
            const tone = classesFor(c.status, c.kind);
            return (
              <div
                key={c.id}
                className={`rounded-lg bg-zinc-50 p-2.5 ring-1 ${tone.ring} dark:bg-zinc-950/60`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                  {c.name}
                </div>
                <div className={`mt-1 text-sm font-semibold ${tone.label}`}>
                  {tone.badge}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
                  {c.status.state === "open"
                    ? `closes ${c.status.closesAtSwiss} · in ${formatDuration(c.status.closesInMs)}`
                    : c.status.state === "break"
                    ? `resumes in ${formatDuration(c.status.resumesInMs)}`
                    : `opens ${c.status.opensAtSwiss} · in ${formatDuration(c.status.opensInMs)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
