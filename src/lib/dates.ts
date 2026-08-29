/**
 * Local-date helpers.
 *
 * Everything dated in this app is a LOCAL calendar day, written YYYY-MM-DD —
 * never a UTC instant. `new Date().toISOString().slice(0, 10)` is the tempting
 * one-liner and it is wrong east of Greenwich for the first hours of every day:
 * at 02:00 IST it returns yesterday, which would silently break a streak.
 */

/** A Date as its LOCAL calendar day. */
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Parse YYYY-MM-DD as local midnight, not as UTC. */
export const fromIso = (s: string) => new Date(`${s}T00:00:00`)

/** `n` days after an ISO day, as an ISO day. Handles month and DST boundaries. */
export function addDays(day: string, n: number): string {
  const d = fromIso(day)
  d.setDate(d.getDate() + n)
  return iso(d)
}

/** "22 Aug 2026", for headings and legends. */
export const fmtDay = (day: string) =>
  fromIso(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** "31 Dec" — no year, for tight labels where the year is already implied. */
export const fmtShort = (day: string) =>
  fromIso(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** True when the string is a real YYYY-MM-DD calendar day. */
export function isValidDay(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = fromIso(s)
  return !Number.isNaN(d.getTime()) && iso(d) === s
}
