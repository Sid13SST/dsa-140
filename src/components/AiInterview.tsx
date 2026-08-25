import { useEffect, useMemo, useRef, useState } from 'react'
import { SD_QUESTIONS, TIERS, type QTier, type SdQuestion } from '../data/sdPractice'
import {
  graderSystem,
  interviewerSystem,
  SYSTEM_DESIGN_DOMAIN,
  type InterviewDomain,
} from '../lib/interviewPrompt'
import {
  completeOnce,
  explainError,
  hasApiKey,
  loadApiKey,
  loadModel,
  pickDefaultModel,
  saveApiKey,
  saveModel,
  streamReply,
  testKey,
  type Turn,
} from '../lib/aiClient'
import Whiteboard from './Whiteboard'

const MINUTES = 45

const TIER_TONE: Record<QTier, string> = {
  warmup: 'text-ac border-ac/40 bg-ac/10',
  core: 'text-brand-deep border-brand/40 bg-brand/10',
  hard: 'text-miss border-miss/40 bg-miss/10',
}

/* ------------------------------ key setup ------------------------------ */

function KeySetup({ onReady }: { onReady: () => void }) {
  const [key, setKey] = useState(loadApiKey())
  const [state, setState] = useState<'idle' | 'testing'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [chosen, setChosen] = useState(loadModel())

  const check = async () => {
    setState('testing')
    setErr(null)
    saveApiKey(key.trim())
    const r = await testKey()
    setState('idle')
    if (!r.ok) {
      setErr(r.error)
      setModels([])
      return
    }
    setModels(r.models)
    // Keep an earlier choice only if the key still offers it.
    const next = r.models.includes(chosen) ? chosen : pickDefaultModel(r.models)
    setChosen(next)
    saveModel(next)
  }

  const start = () => {
    saveModel(chosen)
    onReady()
  }

  return (
    <div className="card p-4">
      <span className="eyebrow">one-time setup</span>
      <h3 className="font-display font-bold text-lg mt-1">Add your Gemini API key</h3>
      <p className="text-sm text-muted mt-1.5">
        This app has no backend, so the interview calls Google directly from your browser with your
        own key. It is stored only in this browser's localStorage — never committed, never bundled,
        never sent anywhere but Google.
      </p>

      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="AIza…"
        className="field w-full mt-3 font-mono text-xs"
        aria-label="Gemini API key"
      />
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          className="btn btn-primary"
          onClick={check}
          disabled={!key.trim() || state === 'testing'}
        >
          {state === 'testing' ? 'Checking…' : 'Save and check'}
        </button>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="btn text-xs"
        >
          Get a key ↗
        </a>
      </div>
      {err && <p className="text-xs text-miss mt-2">{err}</p>}

      {models.length > 0 && (
        <div className="mt-4 pt-3 border-t border-rule">
          <span className="eyebrow">model</span>
          <p className="text-[11px] text-muted mt-0.5">
            Read from your key, not hard-coded — {models.length} available. Pick a{' '}
            <strong>pro</strong> tier for a tougher interviewer, <strong>flash</strong> for a
            cheaper one.
          </p>
          <select
            value={chosen}
            onChange={(e) => {
              setChosen(e.target.value)
              saveModel(e.target.value)
            }}
            className="field w-full mt-2 font-mono text-xs"
            aria-label="Gemini model"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button className="btn btn-primary w-full mt-2" onClick={start} disabled={!chosen}>
            Start interviewing
          </button>
        </div>
      )}

      <p className="text-[11px] text-muted mt-3 pt-3 border-t border-rule">
        Gemini has a free tier with daily limits, which is usually enough for a few interviews a
        day; beyond that a full {MINUTES}-minute round is cents rather than dollars on flash
        models. Use a key you can rotate, and set a quota in the console if you want a hard cap.
      </p>
    </div>
  )
}

/* ------------------------------- the room ------------------------------ */

interface RoomProps {
  domain: InterviewDomain
  q: SdQuestion
  onExit: () => void
}

function Room({ q, onExit, domain }: RoomProps) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [streaming, setStreaming] = useState('')
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [grade, setGrade] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [retryNote, setRetryNote] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const system = useMemo(() => interviewerSystem(q, MINUTES, domain), [q, domain])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, streaming])

  const send = async (text: string, imageBase64?: string) => {
    if (busy) return
    setErr(null)
    const next: Turn[] = [
      ...turns,
      {
        role: 'user',
        text,
        ...(imageBase64 ? { image: { mediaType: 'image/png' as const, base64: imageBase64 } } : {}),
      },
    ]
    setTurns(next)
    setInput('')
    setBusy(true)
    setStreaming('')
    abortRef.current = new AbortController()
    try {
      const full = await streamReply(
        system,
        next,
        (d) => setStreaming((s) => s + d),
        abortRef.current.signal,
        (secs, n) => setRetryNote(`Model busy — retrying in ${secs}s (attempt ${n + 1})…`),
      )
      setRetryNote(null)
      setTurns([...next, { role: 'assistant', text: full }])
    } catch (e) {
      setErr(explainError(e))
      setRetryNote(null)
      // Drop the unanswered user turn so a retry doesn't duplicate it, and put
      // the text back in the box so nothing typed is lost.
      setTurns(next.slice(0, -1))
      setInput(text)
    } finally {
      setStreaming('')
      setBusy(false)
    }
  }

  const begin = async () => {
    setRunning(true)
    await send("I'm ready to start.")
  }

  const finish = async () => {
    setRunning(false)
    setBusy(true)
    setErr(null)
    try {
      const transcript = turns
        .map((t) => `${t.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${t.text}`)
        .join('\n\n')
      const out = await completeOnce(
        graderSystem(q, domain),
        [{ role: 'user', text: `Here is the full transcript.\n\n${transcript}` }],
        4000,
        (secs, n) => setRetryNote(`Model busy — retrying grade in ${secs}s (attempt ${n + 1})…`),
      )
      setRetryNote(null)
      setGrade(out)
    } catch (e) {
      setRetryNote(null)
      setErr(
        `Grading failed after retrying. ${explainError(e)} Your transcript is safe — press "End & grade" again, or copy it below.`,
      )
    } finally {
      setBusy(false)
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const over = elapsed > MINUTES * 60

  return (
    <div className="space-y-3">
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-display font-bold">{q.title}</h3>
            <span
              className={`font-mono text-[9px] uppercase px-1 py-0.5 rounded border ${TIER_TONE[q.tier]}`}
            >
              {q.tier}
            </span>
          </div>
          <p className="text-[11px] text-muted mt-0.5">{q.scope}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-lg font-bold tabular-nums ${over ? 'text-miss' : ''}`}>
            {mm}:{ss}
          </span>
          {turns.length === 0 ? (
            <button className="btn btn-primary text-xs" onClick={begin} disabled={busy}>
              Start interview
            </button>
          ) : (
            <button className="btn text-xs" onClick={finish} disabled={busy || !!grade}>
              End & grade
            </button>
          )}
          <button className="btn text-xs" onClick={onExit}>
            Exit
          </button>
        </div>
      </div>

      {retryNote && (
        <div className="card p-3 border-warn/40">
          <p className="text-xs text-warn">{retryNote}</p>
        </div>
      )}

      {err && (
        <div className="card p-3 border-miss/40">
          <p className="text-xs text-miss">{err}</p>
          {turns.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {!grade && (
                <button className="btn btn-primary text-xs" onClick={finish} disabled={busy}>
                  Retry grading
                </button>
              )}
              <button
                className="btn text-xs"
                onClick={() => {
                  const t = turns
                    .map((x) => `${x.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${x.text}`)
                    .join('\n\n')
                  void navigator.clipboard?.writeText(`${q.title}\n\n${t}`)
                }}
              >
                Copy transcript
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-3 items-start">
        <div className="card p-3 min-w-0">
          <span className="eyebrow">interview</span>
          <div ref={logRef} className="mt-2 space-y-3 max-h-[52vh] overflow-y-auto pr-1">
            {turns.length === 0 && !streaming && (
              <p className="text-sm text-muted py-6 text-center">
                Press <strong>Start interview</strong>. Treat it like the real thing — clarify
                first, then design. It will not go easy on you.
              </p>
            )}
            {turns.map((t, i) => (
              <div key={i} className={t.role === 'user' ? 'text-right' : ''}>
                <span className="eyebrow">{t.role === 'user' ? 'you' : 'interviewer'}</span>
                <p
                  className={`text-[13px] leading-relaxed whitespace-pre-wrap mt-0.5 rounded-lg px-2.5 py-1.5 inline-block text-left ${
                    t.role === 'user' ? 'bg-brand/10' : 'bg-ground'
                  }`}
                >
                  {t.text}
                </p>
                {t.image && (
                  <span className="block font-mono text-[10px] text-muted mt-0.5">
                    · whiteboard attached
                  </span>
                )}
              </div>
            ))}
            {streaming && (
              <div>
                <span className="eyebrow">interviewer</span>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap mt-0.5 bg-ground rounded-lg px-2.5 py-1.5">
                  {streaming}
                  <span className="animate-pulse">▊</span>
                </p>
              </div>
            )}
          </div>

          {!grade && (
            <div className="mt-3 pt-3 border-t border-rule">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && input.trim()) send(input.trim())
                }}
                rows={3}
                disabled={busy || turns.length === 0}
                placeholder={
                  turns.length === 0 ? 'Start the interview first…' : 'Your answer… (Ctrl+Enter to send)'
                }
                className="field w-full resize-y text-[13px]"
              />
              <button
                className="btn btn-primary w-full mt-1.5"
                onClick={() => input.trim() && send(input.trim())}
                disabled={busy || !input.trim()}
              >
                {busy ? 'Thinking…' : 'Send'}
              </button>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <Whiteboard
            busy={busy || turns.length === 0}
            onSnapshot={(b64) =>
              send(input.trim() || 'Here is my diagram so far — what do you think?', b64)
            }
          />
        </div>
      </div>

      {grade && (
        <div className="card p-4">
          <span className="eyebrow">your grade</span>
          <div className="mt-2 text-[13px] leading-relaxed whitespace-pre-wrap">{grade}</div>
          <button className="btn mt-3 text-xs" onClick={onExit}>
            Back to the question list
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ the picker ----------------------------- */

interface Props {
  /** Which bank to draw questions from. Defaults to the system design set. */
  bank?: SdQuestion[]
  domain?: InterviewDomain
  eyebrow?: string
}

export default function AiInterview({
  bank = SD_QUESTIONS,
  domain = SYSTEM_DESIGN_DOMAIN,
  eyebrow = 'ai interviewer',
}: Props = {}) {
  // A key alone isn't enough — without a chosen model every call would fail.
  const [keyReady, setKeyReady] = useState(hasApiKey() && !!loadModel())
  const [openId, setOpenId] = useState<string | null>(null)
  const [tier, setTier] = useState<QTier | 'all'>('all')

  if (!keyReady) return <KeySetup onReady={() => setKeyReady(true)} />

  const open = openId ? bank.find((q) => q.id === openId) ?? null : null
  if (open) return <Room q={open} onExit={() => setOpenId(null)} domain={domain} />

  const visible = bank.filter((q) => tier === 'all' || q.tier === tier)

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="eyebrow">{eyebrow}</span>
          <button className="btn text-xs" onClick={() => setKeyReady(false)}>
            API key
          </button>
        </div>
        <p className="text-[13px] mt-1.5">
          A strict {MINUTES}-minute mock round. It asks one question at a time, goes after your
          weakest answer, and will not accept {domain.refusalExample}. You get a whiteboard, and
          it reads what you draw.
        </p>
        <p className="text-[11px] text-muted mt-1.5">
          It grades you at the end against the same rubric as self-practice — but from the
          transcript, so it can only credit what you actually said.
        </p>
      </div>

      <div className="card p-3">
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => setTier('all')}
            className={`btn text-xs ${tier === 'all' ? 'btn-primary' : ''}`}
          >
            All {bank.length}
          </button>
          {TIERS.filter((t) => bank.some((x) => x.tier === t)).map((t) => (
            <button
              key={t}
              onClick={() => setTier(tier === t ? 'all' : t)}
              className={`btn text-xs capitalize ${tier === t ? 'btn-primary' : ''}`}
            >
              {t} {bank.filter((x) => x.tier === t).length}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-rule/60">
          {visible.map((q) => (
            <li key={q.id}>
              <button
                onClick={() => setOpenId(q.id)}
                className="w-full text-left py-2 px-2 -mx-2 rounded-lg hover:bg-ground
                  transition-colors flex items-center gap-2.5"
              >
                <span
                  className={`font-mono text-[9px] uppercase px-1 py-0.5 rounded border shrink-0 ${TIER_TONE[q.tier]}`}
                >
                  {q.tier}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium truncate">{q.title}</span>
                  <span className="block text-[11px] text-muted truncate">{q.scope}</span>
                </span>
                <span className="font-mono text-[10px] text-muted shrink-0">interview →</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
