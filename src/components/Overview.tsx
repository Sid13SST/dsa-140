import type { Day, Progress } from '../types'
import { computeAnalytics } from '../lib/analytics'

interface StatsProps {
  schedule: Day[]
  progress: Progress
  todayIso: string
}

/**
 * Always-visible KPI strip. Deliberately one dense row — it sits above the tab
 * bar on every view, so it has to cost as little vertical space as possible.
 */
export function StatsBar({ schedule, progress, todayIso }: StatsProps) {
  const s = computeAnalytics(schedule, progress, todayIso)
  const pace = s.expected === 0 ? 0 : Math.round((s.solved / s.expected) * 100)
  const diffTotal = s.byDiff.Easy + s.byDiff.Medium + s.byDiff.Hard || 1

  const items = [
    { label: 'solved', value: `${s.solved}`, sub: `/ ${s.totalUnique}` },
    { label: 'hours', value: s.hours.toFixed(1), sub: 'total' },
    { label: 'streak', value: `${s.streak}`, sub: `best ${s.bestStreak}` },
    { label: 'consistency', value: `${s.consistencyPct}%`, sub: `${s.daysDone}/${s.elapsed}d` },
    { label: 'on-pace', value: `${pace}%`, sub: `${s.solved}/${s.expected}` },
    { label: 'contests', value: `${s.contests}`, sub: 'rated' },
  ]

  return (
    <div className="card px-3 py-2">
      <div className="flex items-center gap-3 overflow-x-auto">
        {items.map((it) => (
          <div key={it.label} className="shrink-0 pr-3 border-r border-rule last:border-0">
            <div className="eyebrow leading-none">{it.label}</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-mono text-lg font-bold tabular-nums leading-none text-ink">
                {it.value}
              </span>
              <span className="font-mono text-[10px] text-muted">{it.sub}</span>
            </div>
          </div>
        ))}

        <div className="shrink-0 min-w-[130px] flex-1">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow leading-none">difficulty</span>
            <span className="font-mono text-[10px] text-muted">
              {s.byDiff.Easy}·{s.byDiff.Medium}·{s.byDiff.Hard}
            </span>
          </div>
          <div className="flex h-1.5 mt-1.5 rounded-full overflow-hidden bg-ground">
            {(['Easy', 'Medium', 'Hard'] as const).map((k) => {
              const color = k === 'Easy' ? 'bg-ac' : k === 'Medium' ? 'bg-warn' : 'bg-miss'
              return (
                <div
                  key={k}
                  className={color}
                  style={{ width: `${(s.byDiff[k] / diffTotal) * 100}%` }}
                  title={`${k}: ${s.byDiff[k]}`}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface GridProps {
  schedule: Day[]
  progress: Progress
  todayIso: string
  selected: string
  onSelect: (iso: string) => void
}

/**
 * The signature view: all 140 days at once, 20 weeks across by weekday down.
 * Colour encodes outcome, so a gap in the run is visible instantly.
 */
export function ConsistencyGrid({ schedule, progress, todayIso, selected, onSelect }: GridProps) {
  const weeks: Day[][] = []
  for (let i = 0; i < schedule.length; i += 7) weeks.push(schedule.slice(i, i + 7))

  const cellClass = (d: Day) => {
    const st = progress[d.date]
    if (st?.status === 'done') {
      const total = d.problems.filter((p) => !p.revisit).length || 1
      const ratio = st.solved.length / total
      if (ratio >= 1) return 'bg-ac border-ac'
      if (ratio > 0) return 'bg-ac/45 border-ac/50'
      return 'bg-ac/20 border-ac/40'
    }
    if (st?.status === 'absent') return 'bg-miss/25 border-miss/40'
    if (d.date < todayIso) return 'bg-warn/15 border-warn/40'
    if (d.date === todayIso) return 'bg-surface border-ink'
    return 'bg-surface border-rule'
  }

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="eyebrow">140-day run · 22 Aug 2026 → 8 Jan 2027</span>
        <span className="font-mono text-[10px] text-muted">
          solved · partial · missed · absent
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px] min-w-max">
          {weeks.map((wk, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {wk.map((d) => (
                <button
                  key={d.date}
                  onClick={() => onSelect(d.date)}
                  title={`Day ${d.day} · ${d.date} · ${d.topic}`}
                  aria-label={`Day ${d.day}, ${d.date}, ${d.topic}`}
                  className={`w-[13px] h-[13px] rounded-[3px] border transition-transform
                    hover:scale-125 focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-brand ${cellClass(d)} ${
                    d.date === selected ? 'ring-2 ring-brand ring-offset-1' : ''
                  } ${d.isCheckpoint ? 'ring-1 ring-warn' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted">
        <Legend className="bg-ac border-ac" label="all solved" />
        <Legend className="bg-ac/45 border-ac/50" label="partial" />
        <Legend className="bg-warn/15 border-warn/40" label="missed" />
        <Legend className="bg-miss/25 border-miss/40" label="absent" />
        <Legend className="bg-surface border-ink" label="today" />
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-[3px] border border-rule ring-1 ring-warn inline-block" />
          31 Dec checkpoint
        </span>
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-3 h-3 rounded-[3px] border inline-block ${className}`} />
      {label}
    </span>
  )
}
