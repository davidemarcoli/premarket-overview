/**
 * Economic-calendar fetch + cache backed by Forex Factory's free weekly JSON
 * feed. Fair Economy explicitly rate-limits this to 2 downloads / 5 minutes /
 * IP and asks consumers to "download once a week and use it for the whole
 * week", so we cache aggressively (6 hours) and fall back to the last good
 * snapshot if a fetch fails.
 *
 * Source: https://nfs.faireconomy.media/ff_calendar_thisweek.json
 */

const FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const TTL_MS = 6 * 60 * 60 * 1000;
/**
 * After a failed fetch, wait at least this long before retrying. FF rate-
 * limits to 2 downloads / 5 min, so a 6-min back-off guarantees we won't
 * compound the problem on a 429.
 */
const ERROR_BACKOFF_MS = 6 * 60 * 1000;

export type CalendarImpact = "high" | "medium" | "low" | "holiday";

export type CalendarEvent = {
  title: string;
  /**
   * Currency code or "All" for cross-market events (e.g. OPEC, G20). FF uses
   * currency codes rather than countries: USD, EUR, GBP, CHF, JPY, AUD, CAD,
   * NZD, CNY.
   */
  currency: string;
  /** Absolute UTC ISO timestamp. FF supplies tz-aware ISO with -04:00 offset. */
  date: string;
  impact: CalendarImpact;
  forecast: string;
  previous: string;
};

type RawEvent = {
  title?: unknown;
  country?: unknown;
  date?: unknown;
  impact?: unknown;
  forecast?: unknown;
  previous?: unknown;
};

function parseImpact(raw: unknown): CalendarImpact {
  if (typeof raw !== "string") return "low";
  switch (raw.toLowerCase()) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "holiday":
      return "holiday";
    default:
      return "low";
  }
}

function isAllowedEvent(e: CalendarEvent): boolean {
  if (e.impact === "holiday") return false;
  if (e.impact === "low") return false;
  // Premarket-relevant currencies + cross-market markers.
  const allowed = new Set(["USD", "EUR", "GBP", "CHF", "All"]);
  return allowed.has(e.currency);
}

type CacheEntry = { fetchedAt: number; events: CalendarEvent[] };
let cache: CacheEntry | null = null;
let lastErrorAt = 0;
let inflight: Promise<CalendarEvent[]> | null = null;

async function fetchFromOrigin(): Promise<CalendarEvent[]> {
  const res = await fetch(FEED_URL, {
    headers: {
      // Identify ourselves politely; the server keeps stats by user-agent.
      "user-agent": "premarket-overview/0.1 (+local)",
      accept: "application/json",
    },
    // Force Node-side fetch (no Next caching layer in front).
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`FF calendar HTTP ${res.status}`);
  }
  const raw = (await res.json()) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error("FF calendar: expected array");
  }
  const events: CalendarEvent[] = [];
  for (const r of raw as RawEvent[]) {
    if (
      typeof r.title !== "string" ||
      typeof r.country !== "string" ||
      typeof r.date !== "string"
    )
      continue;
    const parsed = new Date(r.date);
    if (Number.isNaN(parsed.getTime())) continue;
    const event: CalendarEvent = {
      title: r.title,
      currency: r.country,
      date: parsed.toISOString(),
      impact: parseImpact(r.impact),
      forecast: typeof r.forecast === "string" ? r.forecast : "",
      previous: typeof r.previous === "string" ? r.previous : "",
    };
    if (!isAllowedEvent(event)) continue;
    events.push(event);
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

export async function getCalendar(): Promise<CalendarEvent[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return cache.events;
  }
  // Negative cache: don't hammer FF after a failure (especially 429).
  if (now - lastErrorAt < ERROR_BACKOFF_MS) {
    return cache?.events ?? [];
  }
  if (inflight) {
    return inflight;
  }
  inflight = (async () => {
    try {
      const events = await fetchFromOrigin();
      cache = { fetchedAt: now, events };
      lastErrorAt = 0;
      return events;
    } catch (err) {
      console.error("FF calendar fetch failed", err);
      lastErrorAt = now;
      return cache?.events ?? [];
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
