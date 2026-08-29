import { useEffect, useState } from 'react'
import { SCHEDULE, START_DATE } from '../data/schedule'
import type { Day, DayKind } from '../types'
import { addDays, fromIso, iso, isValidDay } from './dates'
import { hasSavedProgress, loadStartDate, saveStartDate } from './storage'

/**
 * When YOUR 140 days start.
 *
 * The generated schedule is dated from a fixed 22 Aug 2026, which only suits
 * whoever the plan was written for. Anyone signing up later opened the
 * dashboard onto a run already weeks underway: dozens of days marked missed
 * before they had done anything, a streak that could not be started, and
 * consistency stuck near zero. So the plan is treated as what it actually is —
 * 140 numbered days in order — and day 1 is pinned to the day you signed in.
 *
 * Resolved once and then frozen in localStorage, because progress is keyed by
 * date: a start that moved would re-date every day and orphan the log.
 */
export function resolveStartDate(signedUpOn: string | null, today: string): string {
  const stored = loadStartDate()
  if (stored) return stored

  /*
   * A run that predates this change is already keyed to the generated dates,
   * so it keeps them. Re-anchoring an existing log to today would leave every
   * solved problem attached to a date the schedule no longer has.
   */
  if (hasSavedProgress()) return START_DATE

  // Signing up in the evening should not burn day 1 — but an account made
  // months ago should not backdate the run into a wall of missed days either,
  // so a start is never in the future and never earlier than the sign-up day.
  if (signedUpOn && isValidDay(signedUpOn)) return signedUpOn > today ? today : signedUpOn
  return today
}

/**
 * The resolved start for this browser, persisted on first use.
 *
 * Safe to call on the first render: the dashboard only mounts once Protected
 * has a signed-in user (or auth is switched off entirely), so the sign-up date
 * is already known and the value never changes underneath the UI.
 */
export function useRunStart(signedUpOn: string | null, today: string): string {
  const [start] = useState(() => resolveStartDate(signedUpOn, today))

  useEffect(() => {
    if (!loadStartDate()) saveStartDate(start)
  }, [start])

  return start
}

/* ------------------------- re-dating the schedule ------------------------- */

/** Shifted schedules are memoised: the map is keyed by start day. */
const cache = new Map<string, Day[]>()

/**
 * The plan re-dated so day 1 falls on `start`.
 *
 * Day numbers, topics, phases and problem lists are untouched — only the
 * calendar moves. The weekday-derived fields are recomputed rather than
 * shifted, because they describe real-world events: LeetCode Weekly is on a
 * Sunday whatever day of the plan that turns out to be. `review` and `mixed`
 * days come from the day NUMBER (every 14th, and the closing block), so those
 * stay exactly where the generator put them.
 */
export function shiftSchedule(start: string): Day[] {
  if (!isValidDay(start) || start === START_DATE) return SCHEDULE

  const cached = cache.get(start)
  if (cached) return cached

  const shifted = SCHEDULE.map((d): Day => {
    const date = addDays(start, d.day - 1)
    const dow = fromIso(date).getDay() // 0 = Sunday
    const lcWeekly = dow === 0
    // Biweekly rounds alternate; anchored on the first Saturday of the run so
    // the series stays consistent for whatever day it now starts on.
    const lcBiweekly = dow === 6 && Math.floor((d.day - 1) / 7) % 2 === 0
    const kind: DayKind =
      d.kind === 'review' || d.kind === 'mixed' ? d.kind : lcWeekly ? 'contest' : 'study'
    return { ...d, date, kind, lcWeekly, lcBiweekly }
  })

  cache.set(start, shifted)
  return shifted
}

/** The interview-ready milestone, wherever it now falls. */
export const checkpointDay = (schedule: Day[]): Day | undefined =>
  schedule.find((d) => d.isCheckpoint)

/** The scheduled day for today, or the nearest in-range day if today is outside the plan. */
export function resolveToday(schedule: Day[], today: string): string {
  if (today <= schedule[0].date) return schedule[0].date
  const last = schedule[schedule.length - 1]
  if (today >= last.date) return last.date
  return today
}

/** Today's date, as a local calendar day. */
export const todayIso = () => iso(new Date())
