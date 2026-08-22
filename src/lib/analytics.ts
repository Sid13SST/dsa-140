import type { Day, Progress } from '../types'

export interface CoreStats {
  solved: number
  totalUnique: number
  hours: number
  daysDone: number
  absent: number
  contests: number
  byDiff: { Easy: number; Medium: number; Hard: number }
  streak: number
  elapsed: number
  expected: number
}

export function computeStats(schedule: Day[], progress: Progress, todayIso: string): CoreStats {
  let hours = 0
  let daysDone = 0
  let absent = 0
  let contests = 0
  const byDiff = { Easy: 0, Medium: 0, Hard: 0 }

  const solvedSet = new Set<string>()
  for (const d of schedule) {
    const st = progress[d.date]
    if (!st) continue
    if (st.status === 'done') daysDone++
    if (st.status === 'absent') absent++
    hours += st.hours || 0
    if (st.contestDone) contests++
    for (const slug of st.solved) {
      if (solvedSet.has(slug)) continue
      solvedSet.add(slug)
      const p = d.problems.find((x) => x.slug === slug)
      if (p) byDiff[p.difficulty]++
    }
  }
  const solved = solvedSet.size

  const totalUnique = new Set(schedule.flatMap((d) => d.problems.map((p) => p.slug))).size

  // Streak of consecutive days ending today that were done or excused.
  let streak = 0
  const past = schedule.filter((d) => d.date <= todayIso).reverse()
  for (const d of past) {
    const st = progress[d.date]
    if (st?.status === 'done') streak++
    else if (st?.status === 'absent') continue
    else break
  }

  const elapsed = schedule.filter((d) => d.date <= todayIso).length
  const expected = schedule
    .filter((d) => d.date <= todayIso)
    .reduce((n, d) => n + d.problems.filter((p) => !p.revisit).length, 0)

  return { solved, totalUnique, hours, daysDone, absent, contests, byDiff, streak, elapsed, expected }
}

export interface WeekPoint {
  weekStart: string
  hours: number
  solved: number
}

export interface DayPoint {
  date: string
  day: number
  solved: number
  hours: number
}

export interface Analytics extends CoreStats {
  bestStreak: number
  consistencyPct: number
  avgHoursPerActiveDay: number
  avgProblemsPerActiveDay: number
  /** Positive = ahead of the plan by this many scheduled days, negative = behind. */
  paceDeltaDays: number
  projectedFinishIso: string | null
  recentDaily: DayPoint[]
  weekly: WeekPoint[]
}

export function computeAnalytics(schedule: Day[], progress: Progress, todayIso: string): Analytics {
  const core = computeStats(schedule, progress, todayIso)
  const past = schedule.filter((d) => d.date <= todayIso)

  let bestStreak = 0
  let run = 0
  for (const d of past) {
    const st = progress[d.date]
    if (st?.status === 'done') {
      run++
      bestStreak = Math.max(bestStreak, run)
    } else if (st?.status !== 'absent') {
      run = 0
    }
  }

  const consistencyPct = core.elapsed > 0 ? Math.round((core.daysDone / core.elapsed) * 100) : 0
  const avgHoursPerActiveDay = core.daysDone > 0 ? core.hours / core.daysDone : 0
  const avgProblemsPerActiveDay = core.daysDone > 0 ? core.solved / core.daysDone : 0

  // Cumulative non-revisit problem count through each scheduled day, used to
  // translate "problems solved" into "an equivalent day index on the plan".
  let cum = 0
  const cumulative: number[] = schedule.map((d) => (cum += d.problems.filter((p) => !p.revisit).length))
  let aheadIndex = -1
  for (let i = 0; i < cumulative.length; i++) {
    if (cumulative[i] <= core.solved) aheadIndex = i
    else break
  }
  const paceDeltaDays = aheadIndex - (core.elapsed - 1)

  let projectedFinishIso: string | null = null
  if (core.elapsed > 0 && core.solved > 0) {
    const perDay = core.solved / core.elapsed
    const remaining = core.totalUnique - core.solved
    if (remaining > 0 && perDay > 0) {
      const daysNeeded = Math.ceil(remaining / perDay)
      const lastElapsed = past[past.length - 1]?.date ?? todayIso
      const dt = new Date(`${lastElapsed}T00:00:00`)
      dt.setDate(dt.getDate() + daysNeeded)
      projectedFinishIso = dt.toISOString().slice(0, 10)
    } else if (remaining <= 0) {
      projectedFinishIso = past[past.length - 1]?.date ?? todayIso
    }
  }

  const recentDaily: DayPoint[] = past.slice(-14).map((d) => ({
    date: d.date,
    day: d.day,
    solved: progress[d.date]?.solved.length ?? 0,
    hours: progress[d.date]?.hours ?? 0,
  }))

  const weekly: WeekPoint[] = []
  for (let i = 0; i < schedule.length; i += 7) {
    const chunk = schedule.slice(i, i + 7).filter((d) => d.date <= todayIso)
    if (chunk.length === 0) continue
    weekly.push({
      weekStart: schedule[i].date,
      hours: chunk.reduce((n, d) => n + (progress[d.date]?.hours ?? 0), 0),
      solved: chunk.reduce((n, d) => n + (progress[d.date]?.solved.length ?? 0), 0),
    })
  }

  return {
    ...core,
    bestStreak,
    consistencyPct,
    avgHoursPerActiveDay,
    avgProblemsPerActiveDay,
    paceDeltaDays,
    projectedFinishIso,
    recentDaily,
    weekly,
  }
}
