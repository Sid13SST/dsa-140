import { useEffect, useMemo, useRef, useState } from 'react'
import { allRubric, SD_QUESTIONS, TIERS, type QTier, type SdQuestion } from '../data/sdPractice'
import { runtimeLabel, videoUrl } from '../data/systemDesign'
import { emptyAttempt, type SdAttempt, type SdQuizProgress } from '../lib/storage'

interface Props {
  progress: SdQuizProgress
  onChange: (id: string, next: SdAttempt) => void
}

const TIER_META: Record<QTier, { label: string; tone: string }> = {
  warmup: { label: 'warm-up', tone: 'text-ac border-ac/40 bg-ac/10' },
  core: { label: 'core', tone: 'text-brand-deep border-brand/40 bg-brand/10' },
  hard: { label: 'hard', tone: 'text-miss border-miss/40 bg-miss/10' },
}

/** 45 minutes is the real interview length; practising to it is the point. */
const TARGET_SECONDS = 45 * 60

function Timer({ onStop }: { onStop: (elapsed: number) => void }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const startRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [running])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const over = elapsed > TARGET_SECONDS

  return (
    <div className="flex items-center gap-2">
      <span
        className={`font-mono text-lg font-bold tabular-nums ${over ? 'text-miss' : 'text-ink'}`}
        title={over ? 'Past 45 minutes — in a real round you would be out of time' : undefined}
      >
        {mm}:{ss}
      </span>
      {!running ? (
        <button
          className="btn btn-primary text-xs"
          onClick={() => {
            startRef.current = Date.now() - elapsed * 1000
            setRunning(true)
          }}
        >
          {elapsed ? 'Resume' : 'Start 45-min attempt'}
        </button>
      ) : (
        <button
          className="btn text-xs"
          onClick={() => {
            setRunning(false)
            onStop(elapsed)
          }}
        >
          Stop & grade
        </button>
      )}
      {elapsed > 0 && !running && (
        <button className="btn text-xs" onClick={() => setElapsed(0)}>
          Reset
        </button>
      )}
    </div>
  )
}

function QuestionCard({
  q,
  attempt,
  onChange,
  onClose,
}: {
  q: SdQuestion
  attempt: SdAttempt
  onChange: (next: SdAttempt) => void
  onClose: () => void
}) {
  const rubric = useMemo(() => allRubric(q), [q])
  const [graded, setGraded] = useState(attempt.attempts > 0)

  const toggle = (i: number) => {
    const hit = attempt.hit.includes(i)
      ? attempt.hit.filter((x) => x !== i)
      : [...attempt.hit, i]
    onChange({ ...attempt, hit })
  }

  const score = attempt.hit.length
  const pct = Math.round((score / rubric.length) * 100)

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-display font-bold text-lg">{q.title}</h3>
            <span
              className={`font-mono text-[9px] uppercase tracking-wide px-1 py-0.5 rounded border ${TIER_META[q.tier].tone}`}
            >
              {TIER_META[q.tier].label}
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">{q.scope}</p>
        </div>
        <button className="btn text-xs shrink-0" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-rule flex flex-wrap items-center gap-3">
        <Timer
          onStop={() => {
            setGraded(true)
            onChange({
              ...attempt,
              attempts: attempt.attempts + 1,
              lastAt: new Date().toISOString(),
            })
          }}
        />
        <span className="text-[11px] text-muted">
          Design it first — paper or a whiteboard tool. The rubric stays hidden until you stop.
        </span>
      </div>

      <div className="mt-3">
        <span className="eyebrow">clarify first</span>
        <ul className="mt-1 space-y-0.5">
          {q.clarify.map((c) => (
            <li key={c} className="text-[13px] flex gap-2">
              <span className="text-muted shrink-0">?</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {!graded ? (
        <div className="mt-4 rounded-lg border border-dashed border-rule p-3 text-center">
          <p className="text-sm text-muted">
            Rubric hidden. Finish your attempt, then reveal it and grade honestly.
          </p>
          <button className="btn mt-2 text-xs" onClick={() => setGraded(true)}>
            Reveal rubric
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">grade yourself</span>
            <span
              className={`font-mono text-xs font-bold ${
                pct >= 80 ? 'text-ac' : pct >= 50 ? 'text-warn' : 'text-miss'
              }`}
            >
              {score}/{rubric.length} · {pct}%
            </span>
          </div>

          <ul className="mt-1.5 space-y-1">
            {rubric.map((r, i) => (
              <li key={i}>
                <label className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={attempt.hit.includes(i)}
                    onChange={() => toggle(i)}
                    className="w-4 h-4 mt-0.5 shrink-0 accent-ac"
                  />
                  <span
                    className={`text-[13px] leading-snug ${
                      attempt.hit.includes(i) ? 'text-muted' : ''
                    }`}
                  >
                    {r.text}
                    {r.universal && (
                      <span className="ml-1.5 font-mono text-[9px] text-muted uppercase">
                        framework
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <label className="block mt-3">
            <span className="eyebrow">what you missed</span>
            <textarea
              value={attempt.notes}
              onChange={(e) => onChange({ ...attempt, notes: e.target.value })}
              rows={2}
              placeholder="The one thing to remember next time…"
              className="field w-full mt-1 resize-y"
            />
          </label>
        </div>
      )}

      {(q.video || q.reading) && (
        <div className="mt-3 pt-3 border-t border-rule">
          <span className="eyebrow">check your answer against</span>
          <div className="flex flex-col gap-1 mt-1">
            {q.video && (
              <a
                href={videoUrl(q.video.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-baseline gap-1.5 text-[11px] hover:text-brand-deep"
              >
                <span className="font-mono text-[9px] px-1 py-0.5 rounded border shrink-0 text-miss border-miss/40 bg-miss/10">
                  ▶ {runtimeLabel(q.video.seconds)}
                </span>
                <span className="truncate underline decoration-rule">{q.video.title}</span>
                <span className="font-mono text-[9px] text-muted shrink-0">{q.video.channel}</span>
              </a>
            )}
            {q.reading && (
              <a
                href={q.reading.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-baseline gap-1.5 text-[11px] hover:text-brand-deep"
              >
                <span className="font-mono text-[9px] px-1 py-0.5 rounded border shrink-0 text-brand-deep border-brand/40 bg-brand/10">
                  ¶ read
                </span>
                <span className="truncate underline decoration-rule">{q.reading.label}</span>
                <span className="font-mono text-[9px] text-muted shrink-0">{q.reading.source}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SdPractice({ progress, onChange }: Props) {
  const [tier, setTier] = useState<QTier | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const attempted = SD_QUESTIONS.filter((q) => (progress[q.id]?.attempts ?? 0) > 0).length
  const strong = SD_QUESTIONS.filter((q) => {
    const a = progress[q.id]
    if (!a || a.attempts === 0) return false
    return a.hit.length / allRubric(q).length >= 0.8
  }).length

  const visible = SD_QUESTIONS.filter((q) => tier === 'all' || q.tier === tier)
  const open = openId ? SD_QUESTIONS.find((q) => q.id === openId) ?? null : null

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="eyebrow">design practice</span>
          <span className="font-mono text-[10px] text-muted">
            {SD_QUESTIONS.length} questions · 45 min each · self-graded
          </span>
        </div>
        <div className="flex items-baseline gap-4 mt-1.5">
          <div>
            <span className="font-mono text-2xl font-bold tabular-nums leading-none">
              {attempted}
            </span>
            <span className="font-mono text-xs text-muted"> attempted</span>
          </div>
          <div>
            <span className="font-mono text-2xl font-bold tabular-nums leading-none text-ac">
              {strong}
            </span>
            <span className="font-mono text-xs text-muted"> scored 80%+</span>
          </div>
        </div>
        <p className="text-[11px] text-muted mt-2">
          There is no judge for system design, so each question carries a rubric — seven framework
          points plus five specific to that system. Design first, reveal the rubric after, and
          grade yourself honestly. The gap is the study list.
        </p>
      </div>

      {open && (
        <QuestionCard
          q={open}
          attempt={progress[open.id] ?? emptyAttempt()}
          onChange={(next) => onChange(open.id, next)}
          onClose={() => setOpenId(null)}
        />
      )}

      <div className="card p-3">
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => setTier('all')}
            className={`btn text-xs ${tier === 'all' ? 'btn-primary' : ''}`}
          >
            All {SD_QUESTIONS.length}
          </button>
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setTier(tier === t ? 'all' : t)}
              className={`btn text-xs capitalize ${tier === t ? 'btn-primary' : ''}`}
            >
              {TIER_META[t].label} {SD_QUESTIONS.filter((q) => q.tier === t).length}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-rule/60">
          {visible.map((q) => {
            const a = progress[q.id]
            const total = allRubric(q).length
            const pct = a && a.attempts > 0 ? Math.round((a.hit.length / total) * 100) : null
            return (
              <li key={q.id}>
                <button
                  onClick={() => setOpenId(q.id === openId ? null : q.id)}
                  className="w-full text-left py-2 px-2 -mx-2 rounded-lg hover:bg-ground
                    transition-colors flex items-center gap-2.5"
                >
                  <span
                    className={`font-mono text-[9px] uppercase px-1 py-0.5 rounded border shrink-0 ${TIER_META[q.tier].tone}`}
                  >
                    {TIER_META[q.tier].label}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium truncate">{q.title}</span>
                    <span className="block text-[11px] text-muted truncate">{q.scope}</span>
                  </span>
                  {pct === null ? (
                    <span className="font-mono text-[10px] text-muted shrink-0">not tried</span>
                  ) : (
                    <span
                      className={`font-mono text-[10px] shrink-0 font-bold ${
                        pct >= 80 ? 'text-ac' : pct >= 50 ? 'text-warn' : 'text-miss'
                      }`}
                    >
                      {pct}% · {a!.attempts}×
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
