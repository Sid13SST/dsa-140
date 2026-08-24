import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SCHEDULE, TOTAL_DAYS } from './data/schedule'
import type { DayState, Progress } from './types'
import { emptyDay } from './types'
import type { Contest } from './types'
import { exportJSON, importJSON, loadLocal, loadSd, saveLocal, saveSd } from './lib/storage'
import type { SdProgress } from './lib/storage'
import { hasFinished, loadAllContests } from './lib/contests'
import { useNow } from './lib/useNow'
import { useTheme } from './lib/theme'
import Header from './components/Header'
import { ConsistencyGrid, StatsBar } from './components/Overview'
import Analytics from './components/Analytics'
import DayPanel from './components/DayPanel'
import Tabs from './components/Tabs'
import ResourceLibrary, { DayResources } from './components/Resources'
import SystemDesign from './components/SystemDesign'
import { CalendarView, ContestPanel, TopicProgress } from './components/Panels'

type TabId = 'today' | 'progress' | 'analytics' | 'learn' | 'design'

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The scheduled day for today, or the nearest in-range day if today is outside the plan. */
function resolveToday(todayIso: string) {
  if (SCHEDULE.some((d) => d.date === todayIso)) return todayIso
  if (todayIso < SCHEDULE[0].date) return SCHEDULE[0].date
  return SCHEDULE[SCHEDULE.length - 1].date
}

/** How often the browser re-reads contests.json; the server job refreshes it every 6h. */
const CONTEST_REFRESH_MS = 30 * 60 * 1000

export default function App() {
  // A live clock, so nothing derived from "today" freezes at mount. The string
  // only changes value at midnight, so downstream memos stay stable.
  const now = useNow()
  const todayIso = useMemo(() => iso(new Date(now)), [now])

  const [progress, setProgress] = useState<Progress>(() => loadLocal())
  const [selected, setSelected] = useState(() => resolveToday(iso(new Date())))
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [tab, setTab] = useState<TabId>('today')
  const fileRef = useRef<HTMLInputElement>(null)
  const theme = useTheme()

  /* ---- progress lives in this browser; export a JSON backup to move it ---- */
  useEffect(() => {
    saveLocal(progress)
  }, [progress])

  /* ---- the system design track is a separate, self-paced queue ---- */
  const [sdProgress, setSdProgress] = useState<SdProgress>(() => loadSd())
  useEffect(() => {
    saveSd(sdProgress)
  }, [sdProgress])

  const toggleSdDay = useCallback((day: number) => {
    setSdProgress((p) => ({ ...p, [day]: !p[day] }))
  }, [])

  /*
   * Contests load once here and are shared by the contest panel and the
   * calendar's per-day markers — two components fetching the same list would
   * mean two requests for identical data.
   */
  const [fetchedContests, setFetchedContests] = useState<Contest[]>([])
  const [contestError, setContestError] = useState<string | null>(null)
  const [contestsUpdatedAt, setContestsUpdatedAt] = useState<number | null>(null)
  const [contestsLoading, setContestsLoading] = useState(true)
  const lastFetchRef = useRef(0)

  useEffect(() => {
    let alive = true

    const load = () => {
      lastFetchRef.current = Date.now()
      // A wider window than the panel shows, so the calendar can mark contests
      // further out than the next fortnight.
      return loadAllContests(60)
        .then((r) => {
          if (!alive) return
          setFetchedContests(r.contests)
          setContestError(r.contestError)
          setContestsUpdatedAt(r.updatedAt)
        })
        .finally(() => alive && setContestsLoading(false))
    }

    void load()
    const id = setInterval(load, CONTEST_REFRESH_MS)
    // Background tabs throttle intervals, so also catch up on refocus rather
    // than showing a list that stopped updating hours ago.
    const onWake = () => {
      if (!document.hidden && Date.now() - lastFetchRef.current >= CONTEST_REFRESH_MS) void load()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)

    return () => {
      alive = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [])

  // Re-filter against the live clock: the fetch already dropped finished
  // contests, but that was true only at fetch time.
  const contests = useMemo(
    () => fetchedContests.filter((c) => !hasFinished(c, now)),
    [fetchedContests, now],
  )

  const setDay = useCallback((date: string, next: DayState) => {
    setProgress((p) => ({ ...p, [date]: next }))
  }, [])

  const selectedDay = useMemo(
    () => SCHEDULE.find((d) => d.date === selected) ?? SCHEDULE[0],
    [selected],
  )

  /** Contests starting on the selected day, in start order, for its checklist. */
  const selectedDayContests = useMemo(
    () =>
      contests
        .filter((c) => iso(new Date(c.startsAt)) === selectedDay.date)
        .sort((a, b) => a.startsAt - b.startsAt),
    [contests, selectedDay.date],
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
      generatePdfReport(SCHEDULE, progress, todayIso)
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
        theme={theme.theme}
        onToggleTheme={theme.toggle}
      />

      <main className="max-w-6xl mx-auto px-4 py-3 space-y-3">
        <StatsBar schedule={SCHEDULE} progress={progress} todayIso={todayIso} />

        <Tabs
          tabs={[
            { id: 'today' as const, label: 'Today' },
            { id: 'progress' as const, label: 'Progress' },
            { id: 'analytics' as const, label: 'Analytics' },
            { id: 'learn' as const, label: 'Learn' },
            { id: 'design' as const, label: 'Design' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'today' && (
          <div className="grid lg:grid-cols-3 gap-3 items-start">
            {/* min-w-0: grid items default to min-width:auto, so a wide child
                (a long resource label) would otherwise stretch the track past
                the viewport instead of truncating. */}
            <div className="lg:col-span-2 min-w-0">
              <DayPanel
                day={selectedDay}
                state={progress[selectedDay.date] ?? emptyDay()}
                onChange={(next) => setDay(selectedDay.date, next)}
                onJump={jump}
                contests={selectedDayContests}
              />
            </div>
            <div className="space-y-3 min-w-0">
              <DayResources day={selectedDay} />
              <ContestPanel
                contests={contests.slice(0, 14)}
                contestError={contestError}
                loading={contestsLoading}
                now={now}
                updatedAt={contestsUpdatedAt}
              />
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
                contests={contests}
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
              <p className="text-[11px] text-muted mt-2 pt-2 border-t border-rule">
                Progress is saved in this browser only. Use Backup / Restore to move it to
                another browser or device.
              </p>
            </div>
          </div>
        )}

        {tab === 'learn' && <ResourceLibrary schedule={SCHEDULE} />}

        {tab === 'design' && (
          <SystemDesign progress={sdProgress} onToggle={toggleSdDay} />
        )}

        <footer className="text-center text-[11px] text-muted py-3">
          140 days · 22 Aug 2026 → 8 Jan 2027 · interview-ready checkpoint 31 Dec
        </footer>
      </main>
    </div>
  )
}
