import { useMemo, useState } from 'react'
import {
  RESOURCE_POOL,
  SD_GENERAL,
  SD_PHASES,
  SD_TOTAL_DAYS,
  SD_TRACK,
  type SdDay,
} from '../data/systemDesign'
import type { SdProgress } from '../lib/storage'

interface Props {
  progress: SdProgress
  onToggle: (day: number) => void
}

const KIND_META: Record<SdDay['kind'], { label: string; tone: string }> = {
  concept: { label: 'concept', tone: 'text-brand-deep border-brand/40 bg-brand/10' },
  case: { label: 'case study', tone: 'text-warn border-warn/40 bg-warn/10' },
  review: { label: 'review', tone: 'text-ac border-ac/40 bg-ac/10' },
}

function ResourceLinks({ refs }: { refs: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {refs.map((k) => {
        const r = RESOURCE_POOL[k]
        if (!r) return null
        return (
          <a
            key={k}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            title={`${r.label} — ${r.source}`}
            className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-rule
              text-muted hover:text-ink hover:border-brand/40 transition-colors"
          >
            {r.kind === 'video' ? '▶' : '¶'} {r.source} ↗
          </a>
        )
      })}
    </div>
  )
}

function DayRow({
  d,
  done,
  onToggle,
  highlight,
}: {
  d: SdDay
  done: boolean
  onToggle: () => void
  highlight?: boolean
}) {
  const meta = KIND_META[d.kind]
  return (
    <li
      className={`py-2 px-2 -mx-2 rounded-lg ${
        highlight ? 'bg-brand/5 ring-1 ring-brand/25' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          className="w-4 h-4 mt-0.5 shrink-0 accent-ac"
          aria-label={`Mark day ${d.day}, ${d.topic}, complete`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-muted shrink-0">
              {String(d.day).padStart(3, '0')}
            </span>
            <span
              className={`text-[13px] font-medium leading-tight ${
                done ? 'line-through text-muted' : ''
              }`}
            >
              {d.topic}
            </span>
            <span
              className={`font-mono text-[9px] uppercase tracking-wide px-1 py-0.5 rounded border ${meta.tone}`}
            >
              {meta.label}
            </span>
            <span className="font-mono text-[10px] text-muted">{d.minutes}m</span>
          </div>
          <p className="text-[11px] text-muted mt-0.5 leading-snug">{d.prompt}</p>
          <ResourceLinks refs={d.refs} />
        </div>
      </div>
    </li>
  )
}

export default function SystemDesign({ progress, onToggle }: Props) {
  const [phase, setPhase] = useState<string | 'all'>('all')
  const [hideDone, setHideDone] = useState(false)

  const doneCount = useMemo(
    () => SD_TRACK.filter((d) => progress[d.day]).length,
    [progress],
  )

  /**
   * "Next up" is the first unticked day, not today's date. The track is a queue
   * on purpose — falling behind a calendar is what kills a secondary habit.
   */
  const nextUp = useMemo(() => SD_TRACK.find((d) => !progress[d.day]) ?? null, [progress])

  const visible = useMemo(
    () =>
      SD_TRACK.filter(
        (d) => (phase === 'all' || d.phase === phase) && !(hideDone && progress[d.day]),
      ),
    [phase, hideDone, progress],
  )

  const pct = Math.round((doneCount / SD_TOTAL_DAYS) * 100)

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="eyebrow">system design track</span>
          <span className="font-mono text-[10px] text-muted">
            ~20 min/day · runs alongside DSA · no deadlines
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="font-mono text-2xl font-bold tabular-nums leading-none">
            {doneCount}
          </span>
          <span className="font-mono text-xs text-muted">/ {SD_TOTAL_DAYS} days · {pct}%</span>
        </div>
        <div className="h-1.5 bg-ground rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted mt-2">
          DSA stays the priority. This is the tired-evening track — reading and pattern
          spotting, not problem solving. Nothing here is ever late.
        </p>
      </div>

      {nextUp && (
        <div className="card card-hover p-3">
          <span className="eyebrow">next up</span>
          <ul className="mt-1">
            <DayRow
              d={nextUp}
              done={false}
              onToggle={() => onToggle(nextUp.day)}
              highlight
            />
          </ul>
        </div>
      )}

      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            onClick={() => setPhase('all')}
            className={`btn text-xs ${phase === 'all' ? 'btn-primary' : ''}`}
          >
            All
          </button>
          {SD_PHASES.map((p) => (
            <button
              key={p}
              onClick={() => setPhase(phase === p ? 'all' : p)}
              className={`btn text-xs ${phase === p ? 'btn-primary' : ''}`}
            >
              {p}
            </button>
          ))}
          <label className="flex items-center gap-1.5 ml-auto text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(e) => setHideDone(e.target.checked)}
              className="w-3.5 h-3.5 accent-ac"
            />
            hide done
          </label>
        </div>

        <ul className="divide-y divide-rule/60 max-h-[60vh] overflow-y-auto">
          {visible.map((d) => (
            <DayRow
              key={d.day}
              d={d}
              done={!!progress[d.day]}
              onToggle={() => onToggle(d.day)}
            />
          ))}
        </ul>

        {visible.length === 0 && (
          <p className="text-sm text-muted py-3">
            Nothing left here — try another phase or untick “hide done”.
          </p>
        )}
      </div>

      <div className="card p-3">
        <span className="eyebrow">keep these open throughout</span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {SD_GENERAL.map((k) => {
            const r = RESOURCE_POOL[k]
            return (
              <a
                key={k}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-rule
                  text-muted hover:text-ink hover:border-brand/40 transition-colors"
                title={r.source}
              >
                {r.label} ↗
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
