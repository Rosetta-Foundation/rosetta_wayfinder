/**
 * Pure display helpers for timestamps.
 *
 * Storage is always UTC (the Rust ledger emits ISO-8601 `…Z` timestamps). These
 * helpers render that UTC instant in the *viewer's* local timezone, wherever the
 * app happens to be running, and surface which zone that is. Display-only — they
 * never change what is stored.
 */

/**
 * Format a UTC ISO-8601 timestamp as a local date-time string
 * (e.g. `2026-07-24 3:42 PM`). Falls back to the raw input if unparseable.
 *
 * @param timeZone Optional IANA zone override. Omit in production to use the
 *   viewer's system zone (the point of the feature); tests pass it explicitly
 *   because V8 caches `process.env.TZ` and won't switch zones mid-process.
 */
export const formatLocalDateTime = (iso: string, timeZone?: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(d);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(d);
  return `${date} ${time}`;
};

/**
 * The viewer's current timezone abbreviation (e.g. `CDT`, `PST`), derived from
 * the system clock. Falls back to the IANA name, then to `UTC`.
 *
 * @param timeZone Optional IANA zone override (tests only — see
 *   {@link formatLocalDateTime}). Omit in production to use the system zone.
 */
export const localTimezoneLabel = (
  date: Date = new Date(),
  timeZone?: string,
): string => {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
      ...(timeZone ? { timeZone } : {}),
    }).formatToParts(date);
    const tz = parts.find((p) => p.type === "timeZoneName")?.value;
    if (tz) return tz;
  } catch {
    // fall through
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};
