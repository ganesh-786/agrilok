// Calendar dates as a student in Nepal lives them. Everything is a plain ISO
// day ("2026-09-30") in Asia/Kathmandu, so "today", "3 days left" and "closed"
// never shift with the server's time zone.

const DAY_MS = 86_400_000;

/** Today's date in Nepal, as YYYY-MM-DD. */
export function nepalToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}

function toUtcMidnight(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** The ISO day `days` after `iso` (negative for before). */
export function addDays(iso: string, days: number): string {
  return new Date(toUtcMidnight(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`: positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / DAY_MS);
}

/** True for a real calendar day in YYYY-MM-DD form. */
export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(toUtcMidnight(value)).toISOString().slice(0, 10) === value;
}
