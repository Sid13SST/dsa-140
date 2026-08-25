import { useMemo } from 'react'
import type { Day, Progress } from '../types'
import { computeAnalytics } from '../lib/analytics'
import { SD_TRACK, SD_TOTAL_DAYS } from '../data/systemDesign'
import { SD_PRACTICE_BANK } from '../data/sdPracticeBank'
import { allRubric } from '../data/sdPractice'
import { AIML_LABS, AIML_TOTAL_DAYS, AIML_TRACK } from '../data/aiml'
import { AIML_PRACTICE_BANK } from '../data/aimlPracticeBank'
import { aimlRubric } from '../data/aimlPractice'
import type { LabProgress, SdProgress, SdQuizProgress } from '../lib/storage'
import type { Section } from './Sidebar'

interface Props {
  schedule: Day[]
  progress: Progress
  todayIso: string
  sdProgress: SdProgress
  sdQuiz: SdQuizProgress
  aimlProgress: SdProgress
  aimlQuiz: SdQuizProgress
  aimlLabs: LabProgress
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
}: {
  eyebrow: string
  pct: number
  stats: { value: string; label: string; tone?: string }[]
  next: string
  children: React.ReactNode
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
  aimlLabs,
  onGo,
}: Props) {
  const a = useMemo(
    () => computeAnalytics(schedule, progress, todayIso),
    [schedule, progress, todayIso],
  )

  const sd = useMemo(() => {
    const studied = SD_TRACK.filter((d) => sdProgress[d.day]).length
    const attempted = SD_PRACTICE_BANK.filter((q) => (sdQuiz[q.id]?.attempts ?? 0) > 0).length
    const strong = SD_PRACTICE_BANK.filter((q) => {
      const at = sdQuiz[q.id]
      if (!at || at.attempts === 0) return false
      return at.hit.length / allRubric(q).length >= 0.8
    }).length
    const next = SD_TRACK.find((d) => !sdProgress[d.day]) ?? null
    return { studied, attempted, strong, next }
  }, [sdProgress, sdQuiz])

  const ai = useMemo(() => {
    const studied = AIML_TRACK.filter((d) => aimlProgress[d.day]).length
    const attempted = AIML_PRACTICE_BANK.filter((q) => (aimlQuiz[q.id]?.attempts ?? 0) > 0).length
    const strong = AIML_PRACTICE_BANK.filter((q) => {
      const at = aimlQuiz[q.id]
      if (!at || at.attempts === 0) return false
      return at.hit.length / aimlRubric(q).length >= 0.8
    }).length
    const labs = AIML_LABS.filter((l) => aimlLabs[l.id]).length
    const next = AIML_TRACK.find((d) => !aimlProgress[d.day]) ?? null
    return { studied, attempted, strong, labs, next }
  }, [aimlProgress, aimlQuiz, aimlLabs])

  const dsaPct = a.totalUnique ? Math.round((a.solved / a.totalUnique) * 100) : 0
  const sdPct = Math.round((sd.studied / SD_TOTAL_DAYS) * 100)
  const aiPct = Math.round((ai.studied / AIML_TOTAL_DAYS) * 100)
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
            DSA is the priority — the other two run beside it and finish the same week.
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

        {/* ------------------ the two lighter tracks, stacked ------------------ */}
        <div className="space-y-3 min-w-0">
          <MiniTrack
            eyebrow="system design"
            pct={sdPct}
            stats={[
              { value: `${sd.studied}/${SD_TOTAL_DAYS}`, label: 'days' },
              { value: `${sd.attempted}`, label: 'practised' },
              {
                value: `${sd.strong}`,
                label: 'strong',
                tone: sd.strong > 0 ? 'text-ac' : undefined,
              },
            ]}
            next={sd.next ? `Next: ${sd.next.topic}` : 'Track complete — keep practising.'}
          >
            <button className="btn btn-compact btn-primary text-xs" onClick={() => onGo('design', 'study')}>
              Study →
            </button>
            <button className="btn btn-compact text-xs" onClick={() => onGo('design', 'practice')}>
              Practise
            </button>
            <button className="btn btn-compact text-xs" onClick={() => onGo('design', 'interview')}>
              Interview
            </button>
          </MiniTrack>

          <MiniTrack
            eyebrow="ai / ml engineering"
            pct={aiPct}
            stats={[
              { value: `${ai.studied}/${AIML_TOTAL_DAYS}`, label: 'days' },
              { value: `${ai.attempted}`, label: 'practised' },
              {
                value: `${ai.strong}`,
                label: 'strong',
                tone: ai.strong > 0 ? 'text-ac' : undefined,
              },
              { value: `${ai.labs}`, label: 'labs' },
            ]}
            next={
              ai.next
                ? `Next: ${ai.next.topic} · ${ai.next.phase}`
                : 'Track complete — keep building.'
            }
          >
            <button className="btn btn-compact btn-primary text-xs" onClick={() => onGo('aiml', 'study')}>
              Study →
            </button>
            <button className="btn btn-compact text-xs" onClick={() => onGo('aiml', 'practice')}>
              Practise
            </button>
            <button className="btn btn-compact text-xs" onClick={() => onGo('aiml', 'labs')}>
              Labs
            </button>
            <button className="btn btn-compact text-xs" onClick={() => onGo('aiml', 'interview')}>
              Interview
            </button>
          </MiniTrack>
        </div>
      </div>

      <p className="text-[11px] text-muted text-center">
        Everything is stored in this browser. Use <strong>Backup</strong> on the DSA → Analytics tab
        before switching machines.
      </p>
    </div>
  )
}
