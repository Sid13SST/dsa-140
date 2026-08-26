import { useMemo } from 'react'
import type { Day, Progress } from '../types'
import { computeAnalytics } from '../lib/analytics'
import { SD_TRACK, SD_TOTAL_DAYS } from '../data/systemDesign'
import { SD_PRACTICE_BANK } from '../data/sdPracticeBank'
import { allRubric } from '../data/sdPractice'
import { AIML_TRACK } from '../data/aiml'
import {
  RAIL,
  RAIL_DOMAIN_COUNTS,
  RAIL_DOMAIN_META,
  RAIL_TOTAL_DAYS,
  type RailDomain,
} from '../data/track200'
import { FDE_PHASE_COUNTS, FDE_TOTAL_DAYS, FDE_TRACK } from '../data/fde'
import { AIML_PRACTICE_BANK } from '../data/aimlPracticeBank'
import { aimlRubric } from '../data/aimlPractice'
import type { SdProgress, SdQuizProgress } from '../lib/storage'
import type { Section } from './Sidebar'
import type { Contest } from '../types'
import { ConsistencyGrid } from './Overview'
import { ContestPanel } from './Panels'

interface Props {
  schedule: Day[]
  progress: Progress
  todayIso: string
  sdProgress: SdProgress
  sdQuiz: SdQuizProgress
  aimlProgress: SdProgress
  aimlQuiz: SdQuizProgress
  railProgress: SdProgress
  fdeProgress: SdProgress
  contests: Contest[]
  contestError: string | null
  contestsLoading: boolean
  contestsUpdatedAt: number | null
  /** Shared clock, so contest countdowns here agree with the DSA tab. */
  now: number
  selected: string
  onSelectDay: (iso: string) => void
  onGo: (s: Section, tab?: string) => void
}

/** The full-size stat. Used only by DSA — it is the track that decides things. */
function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone?: string
}) {
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className={`font-mono text-3xl font-bold tabular-nums mt-0.5 leading-none ${tone ?? ''}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted mt-1 truncate">{sub}</div>
    </div>
  )
}

/**
 * The condensed stat for the two secondary tracks: value and label share one
 * baseline instead of stacking. That is what buys the vertical space which
 * keeps this page inside a single screen.
 */
function MiniStat({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1 min-w-0">
      <span className={`font-mono text-lg font-bold tabular-nums leading-none ${tone ?? ''}`}>
        {value}
      </span>
      <span className="text-[10px] text-muted truncate">{label}</span>
    </div>
  )
}

function Bar({ pct, tone = 'bg-brand' }: { pct: number; tone?: string }) {
  return (
    <div className="h-1.5 bg-ground rounded-full mt-2 overflow-hidden">
      <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** A secondary track: the same information as DSA, in about a third of the height. */
function MiniTrack({
  eyebrow,
  pct,
  stats,
  next,
  children,
  footer,
}: {
  eyebrow: string
  pct: number
  stats: { value: string; label: string; tone?: string }[]
  next: string
  children: React.ReactNode
  /** Extra content inside the same card — a second card costs a gap plus padding. */
  footer?: React.ReactNode
}) {
  return (
    <div className="card card-hover p-3 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{eyebrow}</span>
        <span className="font-mono text-[10px] text-muted shrink-0">{pct}% of track</span>
      </div>

      <div className="flex items-baseline gap-x-4 gap-y-1 mt-2 flex-wrap">
        {stats.map((s) => (
          <MiniStat key={s.label} {...s} />
        ))}
      </div>
      <Bar pct={pct} />

      {/* Truncated rather than wrapped: a two-line topic would cost the fold. */}
      <p className="text-[11px] text-muted mt-1.5 truncate" title={next}>
        {next}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-2">{children}</div>
      {footer}
    </div>
  )
}

export default function Home({
  schedule,
  progress,
  todayIso,
  sdProgress,
  sdQuiz,
  aimlProgress,
  aimlQuiz,
  railProgress,
  fdeProgress,
  contests,
  contestError,
  contestsLoading,
  contestsUpdatedAt,
  now,
  selected,
  onSelectDay,
  onGo,
}: Props) {
  const a = useMemo(
    () => computeAnalytics(schedule, progress, todayIso),
    [schedule, progress, todayIso],
  )

  /**
   * One secondary number, not two. Practice and interview banks still belong to
   * the design and AI/ML domains, so "practised" sums both — the rail is the
   * single obligation, but the question banks behind it did not merge.
   */
  const rail = useMemo(() => {
    const done = RAIL.filter((d) => railProgress[d.day]).length
    const practised =
      SD_PRACTICE_BANK.filter((q) => (sdQuiz[q.id]?.attempts ?? 0) > 0).length +
      AIML_PRACTICE_BANK.filter((q) => (aimlQuiz[q.id]?.attempts ?? 0) > 0).length
    const strong =
      SD_PRACTICE_BANK.filter((q) => {
        const at = sdQuiz[q.id]
        return at && at.attempts > 0 && at.hit.length / allRubric(q).length >= 0.8
      }).length +
      AIML_PRACTICE_BANK.filter((q) => {
        const at = aimlQuiz[q.id]
        return at && at.attempts > 0 && at.hit.length / aimlRubric(q).length >= 0.8
      }).length
    const next = RAIL.find((d) => !railProgress[d.day]) ?? null

    const order: RailDomain[] = ['backend', 'db', 'linux', 'devops', 'design', 'aiml']
    const byDomain = order.map((key) => ({
      key,
      label: RAIL_DOMAIN_META[key].label,
      total: RAIL_DOMAIN_COUNTS[key] ?? 0,
      done: RAIL.filter((d) => d.domain === key && railProgress[d.day]).length,
    }))

    return { done, practised, strong, next, byDomain }
  }, [railProgress, sdQuiz, aimlQuiz])

  const fde = useMemo(() => {
    const done = FDE_TRACK.filter((d) => fdeProgress[d.day]).length
    const next = FDE_TRACK.find((d) => !fdeProgress[d.day]) ?? null
    const phase = next?.phase ?? null
    const phaseTotal = phase ? (FDE_PHASE_COUNTS[phase] ?? 0) : 0
    const phaseDone = phase
      ? FDE_TRACK.filter((d) => d.phase === phase && fdeProgress[d.day]).length
      : 0
    return { done, next, phase, phaseDone, phaseTotal }
  }, [fdeProgress])

  const dsaPct = a.totalUnique ? Math.round((a.solved / a.totalUnique) * 100) : 0
  const railPct = Math.round((rail.done / RAIL_TOTAL_DAYS) * 100)
  const fdePct = Math.round((fde.done / FDE_TOTAL_DAYS) * 100)
  const pace = a.expected === 0 ? 0 : Math.round((a.solved / a.expected) * 100)
  const todayDay = schedule.find((d) => d.date === todayIso)

  const hour = new Date().getHours()
  const greeting =
    hour < 5
      ? 'Still up'
      : hour < 12
        ? 'Good morning'
        : hour < 18
          ? 'Good afternoon'
          : 'Good evening'

  return (
    /*
     * Deliberately asymmetric. DSA takes two of three columns and keeps the
     * large numbers; the two lighter tracks are condensed beside it rather than
     * stacked underneath, so the whole overview fits one screen. Anything that
     * would push a track below the fold is trimmed instead — a secondary track
     * you have to scroll to is a secondary track you stop looking at.
     */
    <div className="space-y-3">
      <div className="card px-4 py-2.5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="font-display text-lg font-bold min-w-0">
            {greeting}
            {todayDay ? (
              <>
                {' '}
                — day <span className="text-brand">{todayDay.day}</span> of {schedule.length}
              </>
            ) : null}
          </h2>
          <p className="text-[11px] text-muted min-w-0">
            DSA is the priority; the others finish the same week. Saved locally — back up from
            Analytics.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 items-start">
        {/* ------------------------------- DSA ------------------------------- */}
        <div className="card card-hover p-4 lg:col-span-2 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="eyebrow">dsa · 140-day plan</span>
            <span className="font-mono text-[10px] text-muted shrink-0">{dsaPct}% of problems</span>
          </div>

          <p className="text-sm mt-1 truncate">
            {todayDay ? (
              <>
                Today: <span className="font-semibold">{todayDay.topic}</span>
              </>
            ) : (
              <span className="text-muted">Outside the plan window — pick any day to work on.</span>
            )}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <Stat label="solved" value={`${a.solved}`} sub={`of ${a.totalUnique}`} />
            <Stat label="streak" value={`${a.streak}`} sub={`best ${a.bestStreak}`} />
            <Stat
              label="on-pace"
              value={`${pace}%`}
              sub={`${a.solved}/${a.expected} due`}
              tone={pace >= 90 ? 'text-ac' : pace >= 60 ? 'text-warn' : 'text-miss'}
            />
            <Stat label="hours" value={a.hours.toFixed(1)} sub={`${a.daysDone}/${a.elapsed} days`} />
          </div>
          <Bar pct={dsaPct} />

          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-rule">
            <button className="btn btn-primary text-xs" onClick={() => onGo('dsa', 'today')}>
              Today's problems →
            </button>
            <button className="btn text-xs" onClick={() => onGo('dsa', 'progress')}>
              Progress
            </button>
            <button className="btn text-xs" onClick={() => onGo('dsa', 'analytics')}>
              Analytics
            </button>
            <span className="font-mono text-[10px] text-muted ml-auto shrink-0">
              {a.contests} contests
            </span>
          </div>
        </div>

        {/* --------------- the one secondary thread, not two --------------- */}
        <div className="min-w-0">
          <MiniTrack
            eyebrow="the 200 · beside dsa"
            pct={railPct}
            footer={
              /* Six subjects interleaved, so one percentage hides the split. */
              <ul className="mt-2 pt-2 border-t border-rule grid grid-cols-2 gap-x-3 gap-y-0.5">
                {rail.byDomain.map((d) => (
                  <li key={d.key} className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] flex-1 min-w-0 truncate">{d.label}</span>
                    <span className="font-mono text-[9px] text-muted shrink-0 tabular-nums">
                      {d.done}/{d.total}
                    </span>
                    <span className="w-12 h-1 bg-ground rounded-full overflow-hidden shrink-0">
                      <span
                        className="block h-full bg-brand rounded-full"
                        style={{ width: `${d.total ? (d.done / d.total) * 100 : 0}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            }
            stats={[
              { value: `${rail.done}/${RAIL_TOTAL_DAYS}`, label: 'days' },
              { value: `${rail.practised}`, label: 'practised' },
              {
                value: `${rail.strong}`,
                label: 'strong',
                tone: rail.strong > 0 ? 'text-ac' : undefined,
              },
            ]}
            next={
              rail.next
                ? `Next: ${rail.next.topic} · ${RAIL_DOMAIN_META[rail.next.domain].label}`
                : 'Rail complete — keep practising and interviewing.'
            }
          >
            <button className="btn btn-compact btn-primary text-xs" onClick={() => onGo('rail', 'track')}>
              Today's 20 min →
            </button>
            <button className="btn btn-compact text-xs" onClick={() => onGo('rail', 'practice')}>
              Practise
            </button>
            <button className="btn btn-compact text-xs" onClick={() => onGo('rail', 'interview')}>
              Interview
            </button>
            <button className="btn btn-compact text-xs" onClick={() => onGo('library')}>
              Library
            </button>
          </MiniTrack>


        </div>
      </div>

      {/*
        * The space the three cards leave over. Both of these earn it: the run
        * grid is the only view where a broken streak is visible at a glance,
        * and the contest list is the one thing on this page with a deadline.
        */}
      <div className="grid lg:grid-cols-4 gap-3 lg:h-[clamp(8rem,24vh,14rem)] lg:auto-rows-fr">
        <ConsistencyGrid
          className="lg:col-span-2 min-w-0 lg:min-h-0"
          schedule={schedule}
          progress={progress}
          todayIso={todayIso}
          selected={selected}
          onSelect={onSelectDay}
        />
        {/* Bounded to the row and scrolling inside itself — an unbounded
            contest list is 480px tall and pushes everything past the fold.
            The row height is viewport-relative so this fills a tall screen
            without forcing a scroll on a short one. */}
        <ContestPanel
          className="min-w-0 lg:min-h-0"
          contests={contests.slice(0, 12)}
          contestError={contestError}
          loading={contestsLoading}
          now={now}
          updatedAt={contestsUpdatedAt}
        />
        {/* FDE sits here rather than under the rail: stacked, the right-hand
            column reached 436px against DSA's 221 and pushed the page past the
            fold. Across the bottom it costs no height at all. */}
        <div className="min-w-0 lg:min-h-0 overflow-y-auto">
          <MiniTrack
            eyebrow="fde · in demand"
            pct={fdePct}
            stats={[
              { value: `${fde.done}/${FDE_TOTAL_DAYS}`, label: 'days' },
              {
                value: fde.phaseTotal ? `${fde.phaseDone}/${fde.phaseTotal}` : '—',
                label: 'this phase',
              },
            ]}
            next={
              fde.next
                ? `Next: ${fde.next.topic} · ${fde.next.phase}`
                : 'Track complete — rehearse the story.'
            }
          >
            <button className="btn btn-compact btn-primary text-xs" onClick={() => onGo('fde')}>
              Continue →
            </button>
          </MiniTrack>
        </div>
      </div>

    </div>
  )
}
