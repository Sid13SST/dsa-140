import { useEffect, useMemo, useState } from 'react'
import type { Contest, Day, Progress } from '../types'
import { formatCountdown, loadAllContests } from '../lib/contests'

/* ------------------------------ Calendar ------------------------------ */

interface CalProps {
  schedule: Day[]
  progress: Progress
  todayIso: string
  selected: string
  onSelect: (iso: string) => void
}

export function CalendarView({ schedule, progress, todayIso, selected, onSelect }: CalProps) {
  const byDate = useMemo(() => new Map(schedule.map((d) => [d.date, d])), [schedule])
  const months = useMemo(() => {
    const set = new Set(schedule.map((d) => d.date.slice(0, 7)))
    return [...set].sort()
  }, [schedule])

  const [month, setMonth] = useState(() => selected.slice(0, 7))
  useEffect(() => setMonth(selected.slice(0, 7)), [selected])

  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const leading = (first.getUTCDay() + 6) % 7 // Monday-first grid

  const cells: (string | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ]

  const idx = months.indexOf(month)

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          className="btn px-2 py-1 disabled:opacity-30"
          disabled={idx <= 0}
          onClick={() => setMonth(months[idx - 1])}
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="font-display font-bold text-sm">
          {first.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}
        </span>
        <button
          className="btn px-2 py-1 disabled:opacity-30"
          disabled={idx >= months.length - 1}
          onClick={() => setMonth(months[idx + 1])}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="eyebrow py-1">
            {d}
          </div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} />
          const day = byDate.get(iso)
          const st = progress[iso]
          const dayNum = Number(iso.slice(8))

          let tone = 'text-muted/40 border-transparent'
          if (day) {
            if (st?.status === 'done') tone = 'bg-ac text-white border-ac'
            else if (st?.status === 'absent') tone = 'bg-miss/20 text-miss border-miss/40'
            else if (iso < todayIso) tone = 'bg-warn/15 border-warn/40'
            else tone = 'bg-surface border-rule'
          }

          return (
            <button
              key={i}
              disabled={!day}
              onClick={() => day && onSelect(iso)}
              title={day ? `Day ${day.day} · ${day.topic}` : 'Outside the plan'}
              className={`aspect-square rounded-md border font-mono text-xs flex flex-col
                items-center justify-center disabled:cursor-default
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                ${tone} ${iso === selected ? 'ring-2 ring-brand' : ''}
                ${iso === todayIso ? 'font-bold underline' : ''}`}
            >
              <span>{dayNum}</span>
              {day && day.problems.length > 0 && (
                <span className="text-[9px] opacity-70">{day.problems.length}p</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------ Contests ------------------------------ */

export function ContestPanel() {
  const [contests, setContests] = useState<Contest[]>([])
  const [contestError, setContestError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    loadAllContests()
      .then((r) => {
        if (!alive) return
        setContests(r.contests)
        setContestError(r.contestError)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const now = Date.now() + tick * 0

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="eyebrow">upcoming contests</span>
        <div className="flex items-center gap-2">
          <a
            href="https://codeforces.com/contests"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] text-muted hover:text-ink underline"
          >
            codeforces ↗
          </a>
          <a
            href="https://www.codechef.com/contests"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] text-muted hover:text-ink underline"
          >
            codechef ↗
          </a>
        </div>
      </div>

      {loading && <p className="text-sm text-muted py-2">Loading contests…</p>}

      {contestError && (
        <p className="text-xs text-warn mb-2 leading-snug">{contestError}</p>
      )}

      <ul className="divide-y divide-rule">
        {contests.map((c) => {
          const dt = new Date(c.startsAt)
          return (
            <li key={c.id} className="py-2 flex items-center gap-3">
              <span
                className={`w-1.5 h-8 rounded-full shrink-0 ${
                  c.platform === 'LeetCode'
                    ? 'bg-warn'
                    : c.platform === 'CodeChef'
                      ? 'bg-ac'
                      : 'bg-ink'
                }`}
              />
              <div className="flex-1 min-w-0">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium hover:underline block truncate"
                >
                  {c.name}
                </a>
                <div className="font-mono text-[11px] text-muted">
                  {dt.toLocaleString(undefined, {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}{' '}
                  · {c.durationMin}m
                  {c.computed && (
                    <span className="ml-1 text-warn" title="Derived from LeetCode's fixed recurring schedule, not fetched live. Confirm on leetcode.com.">
                      ·  recurring
                    </span>
                  )}
                </div>
              </div>
              <span className="font-mono text-xs text-muted shrink-0">
                in {formatCountdown(c.startsAt - now)}
              </span>
            </li>
          )
        })}
      </ul>

      {!loading && contests.length === 0 && (
        <p className="text-sm text-muted py-2">
          No contests found. Check codeforces.com/contests, codechef.com/contests, and
          leetcode.com/contest directly.
        </p>
      )}
    </div>
  )
}

/* ---------------------------- Topic progress --------------------------- */

export function TopicProgress({
  schedule,
  progress,
}: {
  schedule: Day[]
  progress: Progress
}) {
  const rows = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>()
    const solved = new Set(Object.values(progress).flatMap((s) => s.solved))
    for (const d of schedule) {
      for (const p of d.problems) {
        if (p.revisit) continue
        const r = map.get(p.topic) ?? { total: 0, done: 0 }
        r.total++
        if (solved.has(p.slug)) r.done++
        map.set(p.topic, r)
      }
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [schedule, progress])

  return (
    <div className="card p-3">
      <span className="eyebrow">coverage by topic</span>
      <ul className="mt-2 space-y-1.5">
        {rows.map(([topic, r]) => {
          const pct = Math.round((r.done / r.total) * 100)
          return (
            <li key={topic}>
              <div className="flex justify-between text-xs">
                <span className="truncate pr-2">{topic}</span>
                <span className="font-mono text-muted shrink-0">
                  {r.done}/{r.total}
                </span>
              </div>
              <div className="h-1.5 bg-ground rounded-full mt-0.5 overflow-hidden">
                <div className="h-full bg-ac rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
