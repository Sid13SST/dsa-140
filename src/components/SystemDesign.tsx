import { useMemo, useState } from 'react'
import {
  LONG_SESSION_SECONDS,
  runtimeLabel,
  SD_GENERAL,
  SD_PHASES,
  SD_TOTAL_DAYS,
  SD_TRACK,
  videoUrl,
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

/** What today actually costs: the video's real runtime, or a reading estimate. */
function budget(d: SdDay): { label: string; long: boolean } {
  if (d.video) {
    return {
      label: runtimeLabel(d.video.seconds),
      long: d.video.seconds > LONG_SESSION_SECONDS,
    }
  }
  return { label: '~15m read', long: false }
}

function DayBody({ d }: { d: SdDay }) {
  return (
    <>
      <p className="text-[11px] text-muted mt-0.5 leading-snug">{d.prompt}</p>

      <div className="flex flex-col gap-1 mt-1.5">
        {d.video && (
          <a
            href={videoUrl(d.video.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-baseline gap-1.5 text-[11px] group/link"
          >
            <span className="font-mono text-[9px] px-1 py-0.5 rounded border shrink-0
              text-miss border-miss/40 bg-miss/10">
              ▶ {runtimeLabel(d.video.seconds)}
            </span>
            <span className="min-w-0 truncate group-hover/link:text-brand-deep underline decoration-rule">
              {d.video.title}
            </span>
            <span className="font-mono text-[9px] text-muted shrink-0">{d.video.channel}</span>
          </a>
        )}

        {d.reading && (
          <a
            href={d.reading.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-baseline gap-1.5 text-[11px] group/link"
          >
            <span className="font-mono text-[9px] px-1 py-0.5 rounded border shrink-0
              text-brand-deep border-brand/40 bg-brand/10">
              ¶ read
            </span>
            <span className="min-w-0 truncate group-hover/link:text-brand-deep underline decoration-rule">
              {d.reading.label}
            </span>
            <span className="font-mono text-[9px] text-muted shrink-0">{d.reading.source}</span>
          </a>
        )}

        {d.selfWork && (
          <span className="flex items-baseline gap-1.5 text-[11px]">
            <span className="font-mono text-[9px] px-1 py-0.5 rounded border shrink-0
              text-ac border-ac/40 bg-ac/10">
              ✎ do
            </span>
            <span className="min-w-0 text-muted">{d.selfWork}</span>
          </span>
        )}
      </div>
    </>
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
  const b = budget(d)
  return (
    <li
      className={`py-2 px-2 -mx-2 rounded-lg ${highlight ? 'bg-brand/5 ring-1 ring-brand/25' : ''}`}
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
            <span
              className={`font-mono text-[10px] ${b.long ? 'text-warn font-bold' : 'text-muted'}`}
              title={b.long ? 'Longer than a weeknight session — save it for a weekend' : undefined}
            >
              {b.label}
              {b.long && ' · long'}
            </span>
          </div>
          <DayBody d={d} />
        </div>
      </div>
    </li>
  )
}

export default function SystemDesign({ progress, onToggle }: Props) {
  const [phase, setPhase] = useState<string | 'all'>('all')
  const [hideDone, setHideDone] = useState(false)
  const [shortOnly, setShortOnly] = useState(false)

  const doneCount = useMemo(() => SD_TRACK.filter((d) => progress[d.day]).length, [progress])

  /**
   * "Next up" is the first unticked day, not today's date. The track is a queue
   * on purpose — falling behind a calendar is what kills a secondary habit.
   */
  const nextUp = useMemo(() => SD_TRACK.find((d) => !progress[d.day]) ?? null, [progress])

  const visible = useMemo(
    () =>
      SD_TRACK.filter((d) => {
        if (phase !== 'all' && d.phase !== phase) return false
        if (hideDone && progress[d.day]) return false
        if (shortOnly && budget(d).long) return false
        return true
      }),
    [phase, hideDone, shortOnly, progress],
  )

  const pct = Math.round((doneCount / SD_TOTAL_DAYS) * 100)

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="eyebrow">system design track</span>
          <span className="font-mono text-[10px] text-muted">
            one video or one article per day · no deadlines
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="font-mono text-2xl font-bold tabular-nums leading-none">
            {doneCount}
          </span>
          <span className="font-mono text-xs text-muted">
            / {SD_TOTAL_DAYS} days · {pct}%
          </span>
        </div>
        <div className="h-1.5 bg-ground rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted mt-2">
          DSA stays the priority. Each day links one specific video — with its real runtime — or
          one deep-linked article section, so a session fits the time you actually have.
        </p>
      </div>

      {nextUp && (
        <div className="card card-hover p-3">
          <span className="eyebrow">next up</span>
          <ul className="mt-1">
            <DayRow d={nextUp} done={false} onToggle={() => onToggle(nextUp.day)} highlight />
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
          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={shortOnly}
              onChange={(e) => setShortOnly(e.target.checked)}
              className="w-3.5 h-3.5 accent-ac"
            />
            under 20 min
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
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
            <DayRow key={d.day} d={d} done={!!progress[d.day]} onToggle={() => onToggle(d.day)} />
          ))}
        </ul>

        {visible.length === 0 && (
          <p className="text-sm text-muted py-3">Nothing matches those filters.</p>
        )}
      </div>

      <div className="card p-3">
        <span className="eyebrow">keep these open throughout</span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {SD_GENERAL.map((r) => (
            <a
              key={r.url}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              title={r.source}
              className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-rule
                text-muted hover:text-ink hover:border-brand/40 transition-colors"
            >
              {r.label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
