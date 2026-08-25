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
    <div>
      <div className="eyebrow">{label}</div>
      <div className={`font-mono text-2xl font-bold tabular-nums mt-0.5 leading-none ${tone ?? ''}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted mt-1">{sub}</div>
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
  const greeting = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <span className="eyebrow">overview</span>
        <h2 className="font-display text-xl font-bold mt-1">
          {greeting}
          {todayDay ? (
            <>
              {' '}— day <span className="text-brand">{todayDay.day}</span> of {schedule.length}
            </>
          ) : null}
        </h2>
        <p className="text-sm text-muted mt-1">
          {todayDay
            ? `Today's topic is ${todayDay.topic}.`
            : 'Outside the plan window — pick any day to work on.'}{' '}
          DSA is the priority. System design and AI/ML are the lighter tracks running beside it —
          both are sized to finish the same week the DSA plan does.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 items-start">
        {/* ------------------------------- DSA ------------------------------- */}
        <div className="card card-hover p-4">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">dsa · 140-day plan</span>
            <span className="font-mono text-[10px] text-muted">{dsaPct}% of problems</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <Stat label="solved" value={`${a.solved}`} sub={`of ${a.totalUnique}`} />
            <Stat label="streak" value={`${a.streak}`} sub={`best ${a.bestStreak}`} />
            <Stat
              label="on-pace"
              value={`${pace}%`}
              sub={`${a.solved}/${a.expected} due`}
              tone={pace >= 90 ? 'text-ac' : pace >= 60 ? 'text-warn' : 'text-miss'}
            />
          </div>
          <Bar pct={dsaPct} />

          <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted">
            <span>{a.hours.toFixed(1)}h logged</span>
            <span>·</span>
            <span>
              {a.daysDone}/{a.elapsed} days done
            </span>
            <span>·</span>
            <span>{a.contests} contests</span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-rule">
            <button className="btn btn-primary text-xs" onClick={() => onGo('dsa', 'today')}>
              Today's problems →
            </button>
            <button className="btn text-xs" onClick={() => onGo('dsa', 'progress')}>
              Progress
            </button>
          </div>
        </div>

        {/* ----------------------------- Design ------------------------------ */}
        <div className="card card-hover p-4">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">system design</span>
            <span className="font-mono text-[10px] text-muted">{sdPct}% of track</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <Stat label="studied" value={`${sd.studied}`} sub={`of ${SD_TOTAL_DAYS} days`} />
            <Stat
              label="practised"
              value={`${sd.attempted}`}
              sub={`of ${SD_PRACTICE_BANK.length} questions`}
            />
            <Stat
              label="strong"
              value={`${sd.strong}`}
              sub="scored 80%+"
              tone={sd.strong > 0 ? 'text-ac' : undefined}
            />
          </div>
          <Bar pct={sdPct} />

          <p className="text-[11px] text-muted mt-3">
            {sd.next ? (
              <>
                Next up: <span className="text-ink">{sd.next.topic}</span>
              </>
            ) : (
              'Track complete — keep practising questions.'
            )}
          </p>

          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-rule">
            <button className="btn btn-primary text-xs" onClick={() => onGo('design', 'study')}>
              Continue studying →
            </button>
            <button className="btn text-xs" onClick={() => onGo('design', 'practice')}>
              Practise
            </button>
            <button className="btn text-xs" onClick={() => onGo('design', 'interview')}>
              Mock interview
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------ AI / ML ------------------------------ */}
      <div className="card card-hover p-4">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">ai / ml engineering</span>
          <span className="font-mono text-[10px] text-muted">{aiPct}% of track</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <Stat label="studied" value={`${ai.studied}`} sub={`of ${AIML_TOTAL_DAYS} days`} />
          <Stat
            label="practised"
            value={`${ai.attempted}`}
            sub={`of ${AIML_PRACTICE_BANK.length} questions`}
          />
          <Stat
            label="strong"
            value={`${ai.strong}`}
            sub="scored 80%+"
            tone={ai.strong > 0 ? 'text-ac' : undefined}
          />
          <Stat label="labs" value={`${ai.labs}`} sub={`of ${AIML_LABS.length} built`} />
        </div>
        <Bar pct={aiPct} />

        <p className="text-[11px] text-muted mt-3">
          {ai.next ? (
            <>
              Next up: <span className="text-ink">{ai.next.topic}</span>{' '}
              <span className="text-muted">· {ai.next.phase}</span>
            </>
          ) : (
            'Track complete — keep practising and building.'
          )}
        </p>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-rule">
          <button className="btn btn-primary text-xs" onClick={() => onGo('aiml', 'study')}>
            Continue studying →
          </button>
          <button className="btn text-xs" onClick={() => onGo('aiml', 'practice')}>
            Practise
          </button>
          <button className="btn text-xs" onClick={() => onGo('aiml', 'labs')}>
            Labs
          </button>
          <button className="btn text-xs" onClick={() => onGo('aiml', 'interview')}>
            Mock interview
          </button>
        </div>
      </div>

      <div className="card p-3">
        <p className="text-[11px] text-muted">
          Everything is stored in this browser. Use <strong>Backup</strong> on the DSA → Analytics
          tab before switching machines.
        </p>
      </div>
    </div>
  )
}
