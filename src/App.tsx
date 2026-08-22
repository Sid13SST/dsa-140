import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SCHEDULE, TOTAL_DAYS } from './data/schedule'
import type { DayState, Progress } from './types'
import { emptyDay } from './types'
import { exportJSON, importJSON, loadLocal, saveLocal } from './lib/storage'
import { cloudEnabled, fetchProgress, pushProgress, supabase } from './lib/supabase'
import Header from './components/Header'
import { ConsistencyGrid, StatsBar } from './components/Overview'
import Analytics from './components/Analytics'
import DayPanel from './components/DayPanel'
import Tabs from './components/Tabs'
import ResourceLibrary, { DayResources } from './components/Resources'
import { CalendarView, ContestPanel, TopicProgress } from './components/Panels'

type TabId = 'today' | 'progress' | 'analytics' | 'learn'

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The scheduled day for today, or the nearest in-range day if today is outside the plan. */
function resolveToday(todayIso: string) {
  if (SCHEDULE.some((d) => d.date === todayIso)) return todayIso
  if (todayIso < SCHEDULE[0].date) return SCHEDULE[0].date
  return SCHEDULE[SCHEDULE.length - 1].date
}

export default function App() {
  const todayIso = iso(new Date())
  const [progress, setProgress] = useState<Progress>(() => loadLocal())
  const [selected, setSelected] = useState(() => resolveToday(todayIso))
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [tab, setTab] = useState<TabId>('today')
  const fileRef = useRef<HTMLInputElement>(null)

  /* ---- auth session ---- */
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
      setUserEmail(data.session?.user.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null)
      setUserEmail(session?.user.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  /* ---- pull cloud progress once signed in; local wins if cloud is empty ---- */
  useEffect(() => {
    if (!userId) return
    fetchProgress(userId)
      .then((remote) => {
        if (remote && Object.keys(remote).length) {
          setProgress((local) => ({ ...local, ...remote }))
        } else {
          void pushProgress(userId, progress)
        }
      })
      .catch(() => setSyncState('error'))
    // Intentionally runs on sign-in only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  /* ---- persist: local always, cloud when signed in (debounced) ---- */
  useEffect(() => {
    saveLocal(progress)
    if (!userId) return
    setSyncState('saving')
    const t = setTimeout(() => {
      pushProgress(userId, progress)
        .then(() => setSyncState('idle'))
        .catch(() => setSyncState('error'))
    }, 800)
    return () => clearTimeout(t)
  }, [progress, userId])

  const setDay = useCallback((date: string, next: DayState) => {
    setProgress((p) => ({ ...p, [date]: next }))
  }, [])

  const selectedDay = useMemo(
    () => SCHEDULE.find((d) => d.date === selected) ?? SCHEDULE[0],
    [selected],
  )

  const jump = useCallback(
    (delta: number) => {
      const i = SCHEDULE.findIndex((d) => d.date === selected)
      const next = SCHEDULE[Math.min(SCHEDULE.length - 1, Math.max(0, i + delta))]
      setSelected(next.date)
    },
    [selected],
  )

  const dayNumber = useMemo(() => {
    const d = SCHEDULE.find((x) => x.date === todayIso)
    return d?.day ?? null
  }, [todayIso])

  /* ---- backlog: unsolved problems from days already past ---- */
  const backlog = useMemo(() => {
    const out: { slug: string; title: string; date: string; difficulty: string }[] = []
    for (const d of SCHEDULE) {
      if (d.date >= todayIso) break
      const st = progress[d.date]
      if (st?.status === 'absent') continue
      for (const p of d.problems) {
        if (p.revisit) continue
        if (!st?.solved.includes(p.slug)) {
          out.push({ slug: p.slug, title: p.title, date: d.date, difficulty: p.difficulty })
        }
      }
    }
    return out
  }, [progress, todayIso])

  const downloadBackup = () => {
    const blob = new Blob([exportJSON(progress)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `dsa140-progress-${todayIso}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const downloadPdfReport = async () => {
    setGeneratingPdf(true)
    try {
      // jsPDF + autotable are only needed here, so they're code-split into a
      // chunk that loads on demand instead of bloating the initial page load.
      const { generatePdfReport } = await import('./lib/pdfReport')
      generatePdfReport(SCHEDULE, progress, todayIso, { studentName: userEmail ?? undefined })
    } finally {
      setGeneratingPdf(false)
    }
  }

  const upload = async (f: File) => {
    try {
      setProgress(importJSON(await f.text()))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not read that file.')
    }
  }

  const backlogPanel = backlog.length > 0 && (
    <div className="card p-3">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">backlog</span>
        <span className="font-mono text-xs text-miss">{backlog.length} unsolved</span>
      </div>
      <p className="text-xs text-muted mt-1">
        From days that have passed. Absent days are excluded.
      </p>
      <ul className="mt-2 max-h-56 overflow-y-auto divide-y divide-rule">
        {backlog.slice(0, 60).map((b) => (
          <li key={b.slug} className="py-1.5 flex items-center gap-2 text-sm">
            <span className="font-mono text-[10px] text-muted w-16 shrink-0">
              {b.date.slice(5)}
            </span>
            <a
              href={`https://leetcode.com/problems/${b.slug}/`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 hover:underline truncate"
            >
              {b.title}
            </a>
            <span className="font-mono text-[10px] text-muted shrink-0">{b.difficulty}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="min-h-full">
      <Header
        dayNumber={dayNumber}
        totalDays={TOTAL_DAYS}
        userEmail={userEmail}
        syncState={syncState}
      />

      <main className="max-w-6xl mx-auto px-4 py-3 space-y-3">
        <StatsBar schedule={SCHEDULE} progress={progress} todayIso={todayIso} />

        <Tabs
          tabs={[
            { id: 'today', label: 'Today' },
            { id: 'progress', label: 'Progress' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'learn', label: 'Learn' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'today' && (
          <div className="grid lg:grid-cols-3 gap-3 items-start">
            <div className="lg:col-span-2">
              <DayPanel
                day={selectedDay}
                state={progress[selectedDay.date] ?? emptyDay()}
                onChange={(next) => setDay(selectedDay.date, next)}
                onJump={jump}
              />
            </div>
            <div className="space-y-3">
              <DayResources day={selectedDay} />
              <ContestPanel />
            </div>
          </div>
        )}

        {tab === 'progress' && (
          <div className="space-y-3">
            <ConsistencyGrid
              schedule={SCHEDULE}
              progress={progress}
              todayIso={todayIso}
              selected={selected}
              onSelect={setSelected}
            />
            <div className="grid lg:grid-cols-3 gap-3 items-start">
              <CalendarView
                schedule={SCHEDULE}
                progress={progress}
                todayIso={todayIso}
                selected={selected}
                onSelect={setSelected}
              />
              <TopicProgress schedule={SCHEDULE} progress={progress} />
              <div className="space-y-3">{backlogPanel}</div>
            </div>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="space-y-3">
            <Analytics schedule={SCHEDULE} progress={progress} todayIso={todayIso} />

            <div className="card p-3">
              <span className="eyebrow">your data</span>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  className="btn btn-primary"
                  onClick={downloadPdfReport}
                  disabled={generatingPdf}
                >
                  {generatingPdf ? 'Generating report…' : 'Export PDF report ↓'}
                </button>
                <button className="btn text-xs" onClick={downloadBackup}>
                  Backup (JSON)
                </button>
                <button className="btn text-xs" onClick={() => fileRef.current?.click()}>
                  Restore
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                />
                <p className="text-[11px] text-muted flex-1 min-w-[200px]">
                  The PDF is a detailed, printable report — every stat, weekly summary, topic
                  coverage, and the full 140-day log.
                </p>
              </div>
              {!cloudEnabled && (
                <p className="text-[11px] text-muted mt-2 pt-2 border-t border-rule">
                  Running in local mode — progress is saved in this browser only. Add your
                  Supabase keys to sign in and sync across devices, or keep a JSON backup.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === 'learn' && <ResourceLibrary schedule={SCHEDULE} />}

        <footer className="text-center text-[11px] text-muted py-3">
          140 days · 22 Aug 2026 → 8 Jan 2027 · interview-ready checkpoint 31 Dec
        </footer>
      </main>
    </div>
  )
}
