import { useEffect, useMemo, useState } from 'react'
import type { Contest, Day, Progress } from '../types'
import { PLATFORMS } from '../types'
import { formatCountdown } from '../lib/contests'

/** Local YYYY-MM-DD for a contest's start, so it lands on the right calendar cell. */
const contestDateIso = (startsAt: number) => {
  const d = new Date(startsAt)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A small colour+initial chip. The initial is what keeps it readable for CVD. */
export function PlatformBadge({ platform, className = '' }: { platform: Contest['platform']; className?: string }) {
  const p = PLATFORMS[platform]
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wide
        px-1 py-0.5 rounded border ${p.text} ${p.border} ${className}`}
      style={{ backgroundColor: 'rgb(var(--surface))' }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
      {p.short}
    </span>
  )
}

/* ------------------------------ Calendar ------------------------------ */

interface CalProps {
  schedule: Day[]
  progress: Progress
  todayIso: string
  selected: string
  onSelect: (iso: string) => void
  contests: Contest[]
}

export function CalendarView({
  schedule,
  progress,
  todayIso,
  selected,
  onSelect,
  contests,
}: CalProps) {
  // Contests grouped by the day they start, for the per-cell markers.
  const contestsByDate = useMemo(() => {
    const map = new Map<string, Contest[]>()
    for (const c of contests) {
      const key = contestDateIso(c.startsAt)
      const list = map.get(key)
      if (list) list.push(c)
      else map.set(key, [c])
    }
    return map
  }, [contests])
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
            if (st?.status === 'done') tone = 'bg-ac text-on-accent border-ac'
            else if (st?.status === 'absent') tone = 'bg-miss/20 text-miss border-miss/40'
            else if (iso < todayIso) tone = 'bg-warn/15 border-warn/40'
            else tone = 'bg-surface border-rule'
          }

          const dayContests = contestsByDate.get(iso) ?? []
          // One dot per platform, so two LeetCode rounds don't render twice.
          const platforms = [...new Set(dayContests.map((c) => c.platform))]
          const contestTitle = dayContests
            .map(
              (c) =>
                `${PLATFORMS[c.platform].short} · ${c.name} · ${new Date(
                  c.startsAt,
                ).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`,
            )
            .join('\n')

          return (
            <button
              key={i}
              disabled={!day}
              onClick={() => day && onSelect(iso)}
              title={
                [day ? `Day ${day.day} · ${day.topic}` : 'Outside the plan', contestTitle]
                  .filter(Boolean)
                  .join('\n') || undefined
              }
              className={`aspect-square rounded-md border font-mono text-xs flex flex-col
                items-center justify-center gap-0.5 disabled:cursor-default
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                ${tone} ${iso === selected ? 'ring-2 ring-brand' : ''}
                ${iso === todayIso ? 'font-bold underline' : ''}`}
            >
              <span className="leading-none">{dayNum}</span>
              {day && day.problems.length > 0 && (
                <span className="text-[9px] opacity-70 leading-none">{day.problems.length}p</span>
              )}
              {platforms.length > 0 && (
                <span className="flex gap-[2px] leading-none">
                  {platforms.map((p) => (
                    <span
                      key={p}
                      className={`w-1.5 h-1.5 rounded-full ${PLATFORMS[p].dot}`}
                      aria-label={`${p} contest`}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-rule">
        <span className="eyebrow">contests</span>
        {(Object.keys(PLATFORMS) as (keyof typeof PLATFORMS)[]).map((p) => (
          <span key={p} className="flex items-center gap-1 text-[11px] text-muted">
            <span className={`w-1.5 h-1.5 rounded-full ${PLATFORMS[p].dot}`} />
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------ Contests ------------------------------ */

export function ContestPanel({
  contests,
  contestError,
  loading,
}: {
  contests: Contest[]
  contestError: string | null
  loading: boolean
}) {
  const [tick, setTick] = useState(0)
  const [platformFilter, setPlatformFilter] = useState<Contest['platform'] | 'all'>('all')

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const now = Date.now() + tick * 0
  const shown =
    platformFilter === 'all' ? contests : contests.filter((c) => c.platform === platformFilter)

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <span className="eyebrow">upcoming contests</span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {(Object.keys(PLATFORMS) as (keyof typeof PLATFORMS)[]).map((p) => (
            <a
              key={p}
              href={PLATFORMS[p].listUrl}
              target="_blank"
              rel="noreferrer"
              title={`Open ${p} contests`}
              className={`font-mono text-[10px] hover:underline ${PLATFORMS[p].text}`}
            >
              {PLATFORMS[p].short} ↗
            </a>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mb-2 flex-wrap">
        <button
          onClick={() => setPlatformFilter('all')}
          className={`font-mono text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            platformFilter === 'all'
              ? 'bg-brand text-on-accent border-brand'
              : 'text-muted border-rule hover:text-ink'
          }`}
        >
          ALL {contests.length}
        </button>
        {(Object.keys(PLATFORMS) as (keyof typeof PLATFORMS)[]).map((p) => {
          const n = contests.filter((c) => c.platform === p).length
          const active = platformFilter === p
          return (
            <button
              key={p}
              onClick={() => setPlatformFilter(active ? 'all' : p)}
              disabled={n === 0}
              title={p}
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded border transition-colors
                flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed
                ${active ? `${PLATFORMS[p].text} ${PLATFORMS[p].border}` : 'text-muted border-rule hover:text-ink'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${PLATFORMS[p].dot}`} />
              {PLATFORMS[p].short} {n}
            </button>
          )
        })}
      </div>

      {loading && <p className="text-sm text-muted py-2">Loading contests…</p>}

      {contestError && (
        <p className="text-xs text-warn mb-2 leading-snug">{contestError}</p>
      )}

      <ul className="divide-y divide-rule">
        {shown.map((c) => {
          const dt = new Date(c.startsAt)
          return (
            <li key={c.id} className="py-2 flex items-center gap-2.5">
              <span
                className={`w-1.5 h-9 rounded-full shrink-0 ${PLATFORMS[c.platform].dot}`}
                aria-hidden="true"
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
                <div className="font-mono text-[11px] text-muted flex items-center gap-1.5 flex-wrap">
                  <PlatformBadge platform={c.platform} />
                  <span>
                    {dt.toLocaleString(undefined, {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}{' '}
                    · {c.durationMin}m
                  </span>
                  {c.computed && (
                    <span
                      className="text-warn"
                      title="Derived from LeetCode's fixed recurring schedule, not fetched live. Confirm on leetcode.com."
                    >
                      · recurring
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

      {!loading && shown.length === 0 && (
        <p className="text-sm text-muted py-2">
          {contests.length === 0
            ? 'No contests found. Check the platform links above directly.'
            : `No upcoming ${platformFilter} contests in this window.`}
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
