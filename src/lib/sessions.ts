export type SessionKind = "pre" | "regular" | "post";

export type SessionDef = {
  id: string;
  /** Display label. */
  name: string;
  /** IANA timezone of the venue. */
  tz: string;
  /** Open in local HH:MM. */
  open: string;
  /** Close in local HH:MM. */
  close: string;
  /** Optional lunch break (e.g. Tokyo). */
  breakStart?: string;
  breakEnd?: string;
  kind: SessionKind;
  /** Trading days. 0=Sun..6=Sat. Defaults to Mon–Fri. */
  weekdays?: number[];
};

export type SessionStatus =
  | { state: "open"; closesInMs: number; closesAtSwiss: string }
  | { state: "break"; resumesInMs: number }
  | { state: "closed"; opensInMs: number; opensAtSwiss: string };

export const SESSIONS: SessionDef[] = [
  {
    id: "tokyo",
    name: "Tokyo",
    tz: "Asia/Tokyo",
    open: "09:00",
    close: "15:00",
    breakStart: "11:30",
    breakEnd: "12:30",
    kind: "regular",
  },
  {
    id: "hong-kong",
    name: "Hong Kong",
    tz: "Asia/Hong_Kong",
    open: "09:30",
    close: "16:00",
    kind: "regular",
  },
  {
    id: "london",
    name: "London",
    tz: "Europe/London",
    open: "08:00",
    close: "16:30",
    kind: "regular",
  },
  {
    id: "eurozone",
    name: "Eurozone",
    tz: "Europe/Berlin",
    open: "09:00",
    close: "17:30",
    kind: "regular",
  },
  {
    id: "us-pre",
    name: "US Pre-market",
    tz: "America/New_York",
    open: "04:00",
    close: "09:30",
    kind: "pre",
  },
  {
    id: "nyse",
    name: "NYSE",
    tz: "America/New_York",
    open: "09:30",
    close: "16:00",
    kind: "regular",
  },
  {
    id: "us-post",
    name: "US After-hours",
    tz: "America/New_York",
    open: "16:00",
    close: "20:00",
    kind: "post",
  },
];

/**
 * Convert local-clock HH:MM in a given IANA timezone, on a given calendar
 * date in that zone, to an absolute UTC `Date`. Works by formatting parts in
 * the target zone, walking the wall-clock target backwards through DST.
 */
function localClockToInstant(
  yearLocal: number,
  monthLocal: number, // 1..12
  dayLocal: number,
  hh: number,
  mm: number,
  tz: string,
): Date {
  // First guess: treat as UTC at that wall-clock.
  let guess = new Date(Date.UTC(yearLocal, monthLocal - 1, dayLocal, hh, mm, 0));
  // Refine twice (handles DST + offset).
  for (let i = 0; i < 2; i++) {
    const parts = formatTzParts(guess, tz);
    const seenY = parts.year;
    const seenMo = parts.month;
    const seenD = parts.day;
    const seenH = parts.hour;
    const seenMi = parts.minute;
    const targetUTC = Date.UTC(yearLocal, monthLocal - 1, dayLocal, hh, mm, 0);
    const seenUTC = Date.UTC(seenY, seenMo - 1, seenD, seenH, seenMi, 0);
    const drift = seenUTC - targetUTC;
    if (drift === 0) break;
    guess = new Date(guess.getTime() - drift);
  }
  return guess;
}

function formatTzParts(d: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // Intl returns "24" instead of "00" for midnight in some locales/runtimes.
  const hour = parseInt(get("hour"), 10) % 24;
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour,
    minute: parseInt(get("minute"), 10),
    weekdayShort: get("weekday"),
  };
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function isTradingDay(weekdayShort: string, weekdays?: number[]): boolean {
  const allowed = weekdays ?? [1, 2, 3, 4, 5];
  return allowed.includes(WEEKDAY_MAP[weekdayShort] ?? -1);
}

function parseHM(hm: string): [number, number] {
  const [h, m] = hm.split(":").map((s) => parseInt(s, 10));
  return [h, m];
}

/**
 * Get the session window (open, close, optional break) for a given session
 * on the calendar date corresponding to `now` in the session's timezone.
 */
function windowFor(now: Date, s: SessionDef, dayOffset = 0) {
  const local = formatTzParts(now, s.tz);
  // Shift the local calendar date by dayOffset.
  const shifted = new Date(
    Date.UTC(local.year, local.month - 1, local.day + dayOffset, 12, 0, 0),
  );
  const shiftedLocal = formatTzParts(shifted, s.tz);
  const [oh, om] = parseHM(s.open);
  const [ch, cm] = parseHM(s.close);
  const openAt = localClockToInstant(
    shiftedLocal.year,
    shiftedLocal.month,
    shiftedLocal.day,
    oh,
    om,
    s.tz,
  );
  const closeAt = localClockToInstant(
    shiftedLocal.year,
    shiftedLocal.month,
    shiftedLocal.day,
    ch,
    cm,
    s.tz,
  );
  let breakStartAt: Date | undefined;
  let breakEndAt: Date | undefined;
  if (s.breakStart && s.breakEnd) {
    const [bsh, bsm] = parseHM(s.breakStart);
    const [beh, bem] = parseHM(s.breakEnd);
    breakStartAt = localClockToInstant(
      shiftedLocal.year,
      shiftedLocal.month,
      shiftedLocal.day,
      bsh,
      bsm,
      s.tz,
    );
    breakEndAt = localClockToInstant(
      shiftedLocal.year,
      shiftedLocal.month,
      shiftedLocal.day,
      beh,
      bem,
      s.tz,
    );
  }
  return {
    openAt,
    closeAt,
    breakStartAt,
    breakEndAt,
    weekdayShort: shiftedLocal.weekdayShort,
  };
}

const SWISS_HM = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function swissHM(d: Date): string {
  return SWISS_HM.format(d);
}

/** Find the next future open within the next 8 calendar days, respecting weekdays. */
function nextOpen(now: Date, s: SessionDef): { openAt: Date; closeAt: Date } | null {
  for (let offset = 0; offset < 8; offset++) {
    const w = windowFor(now, s, offset);
    if (!isTradingDay(w.weekdayShort, s.weekdays)) continue;
    if (w.openAt.getTime() > now.getTime()) {
      return { openAt: w.openAt, closeAt: w.closeAt };
    }
  }
  return null;
}

export function getSessionStatus(now: Date, s: SessionDef): SessionStatus {
  const todayW = windowFor(now, s, 0);
  const isToday = isTradingDay(todayW.weekdayShort, s.weekdays);

  if (
    isToday &&
    now.getTime() >= todayW.openAt.getTime() &&
    now.getTime() < todayW.closeAt.getTime()
  ) {
    // In session — check break.
    if (
      todayW.breakStartAt &&
      todayW.breakEndAt &&
      now.getTime() >= todayW.breakStartAt.getTime() &&
      now.getTime() < todayW.breakEndAt.getTime()
    ) {
      return {
        state: "break",
        resumesInMs: todayW.breakEndAt.getTime() - now.getTime(),
      };
    }
    return {
      state: "open",
      closesInMs: todayW.closeAt.getTime() - now.getTime(),
      closesAtSwiss: swissHM(todayW.closeAt),
    };
  }

  const next = nextOpen(now, s);
  if (!next) {
    return { state: "closed", opensInMs: -1, opensAtSwiss: "—" };
  }
  return {
    state: "closed",
    opensInMs: next.openAt.getTime() - now.getTime(),
    opensAtSwiss: swissHM(next.openAt),
  };
}

export function formatDuration(ms: number): string {
  if (ms < 0) return "—";
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return "<1m";
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m === 0 ? `${h}h` : `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
