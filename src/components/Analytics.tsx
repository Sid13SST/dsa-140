import type { Day, Progress } from '../types'
import { computeAnalytics } from '../lib/analytics'

interface Props {
  schedule: Day[]
  progress: Progress
  todayIso: string
}

function fmtShort(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
  })
}

/** Thin single-series bar chart: bars grow from a shared baseline, values direct-labeled on hover. */
function BarTrack({
  points,
  max,
  barClass,
  labelEvery = 1,
}: {
  points: { key: string; value: number; label: string; tooltip: string; emphasize?: boolean }[]
  max: number
  barClass: string
  labelEvery?: number
}) {
  const safeMax = max || 1
  return (
    <div>
      <div className="flex items-end gap-1 h-16">
        {points.map((p) => (
          <div key={p.key} className="flex-1 h-full flex flex-col justify-end group" title={p.tooltip}>
            <span
              className={`w-full rounded-t-[3px] transition-colors ${barClass} ${
                p.emphasize ? 'ring-2 ring-brand ring-offset-1' : ''
              }`}
              style={{
                height: `${Math.max((p.value / safeMax) * 100, p.value > 0 ? 6 : 2)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {points.map((p, i) => (
          <div key={p.key} className="flex-1 text-center">
            {(i === 0 || i === points.length - 1 || i % labelEvery === 0) && (
              <span className="font-mono text-[9px] text-muted">{p.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analytics({ schedule, progress, todayIso }: Props) {
  const a = computeAnalytics(schedule, progress, todayIso)

  const dailyMax = Math.max(...a.recentDaily.map((d) => d.solved), 1)
  const weeklyMax = Math.max(...a.weekly.map((w) => w.hours), 1)

  const paceLabel =
    a.paceDeltaDays > 0
      ? `${a.paceDeltaDays}d ahead`
      : a.paceDeltaDays < 0
        ? `${Math.abs(a.paceDeltaDays)}d behind`
        : 'on schedule'
  const paceTone = a.paceDeltaDays > 0 ? 'text-ac' : a.paceDeltaDays < 0 ? 'text-miss' : 'text-muted'

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between mb-3">
        <span className="eyebrow">study analytics</span>
        <span className="font-mono text-[10px] text-muted">last 14 scheduled days</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-rule bg-ground/50 px-3 py-2.5">
          <div className="eyebrow">pace vs plan</div>
          <div className={`font-mono text-lg font-bold mt-0.5 ${paceTone}`}>{paceLabel}</div>
          <div className="text-[11px] text-muted mt-0.5">based on problems solved so far</div>
        </div>
        <div className="rounded-lg border border-rule bg-ground/50 px-3 py-2.5">
          <div className="eyebrow">projected finish</div>
          <div className="font-mono text-lg font-bold mt-0.5 text-ink">
            {a.projectedFinishIso ? fmtShort(a.projectedFinishIso) : '—'}
          </div>
          <div className="text-[11px] text-muted mt-0.5">at your current solve rate</div>
        </div>
        <div className="rounded-lg border border-rule bg-ground/50 px-3 py-2.5">
          <div className="eyebrow">avg per active day</div>
          <div className="font-mono text-lg font-bold mt-0.5 text-ink">
            {a.avgProblemsPerActiveDay.toFixed(1)} <span className="text-xs font-normal text-muted">solved</span>
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            {a.avgHoursPerActiveDay.toFixed(1)}h logged / active day
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-semibold text-ink">Solve velocity</span>
            <span className="font-mono text-[10px] text-muted">problems / day</span>
          </div>
          <BarTrack
            barClass="bg-brand/80 group-hover:bg-brand"
            max={dailyMax}
            points={a.recentDaily.map((d) => ({
              key: d.date,
              value: d.solved,
              label: String(d.day),
              tooltip: `Day ${d.day} · ${d.date}: ${d.solved} solved`,
              emphasize: d.date === todayIso,
            }))}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-semibold text-ink">Hours per week</span>
            <span className="font-mono text-[10px] text-muted">since day 1</span>
          </div>
          <BarTrack
            barClass="bg-ac/80 group-hover:bg-ac"
            max={weeklyMax}
            labelEvery={2}
            points={a.weekly.map((w, i) => ({
              key: w.weekStart,
              value: w.hours,
              label: `W${i + 1}`,
              tooltip: `Week ${i + 1} (from ${w.weekStart}): ${w.hours.toFixed(1)}h, ${w.solved} solved`,
            }))}
          />
        </div>
      </div>
    </div>
  )
}
