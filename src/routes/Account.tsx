import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AccessFacts, CheckingAccount, useStalled } from '../components/AccessNotice'
import { useAccess } from '../lib/access'
import type { CoreStats } from '../lib/analytics'
import { useAuth } from '../lib/auth'
import { fmtDay, iso } from '../lib/dates'
import {
  exportJSON,
  loadAiml,
  loadFde,
  loadLocal,
  loadRail,
  loadSd,
  type SdProgress,
} from '../lib/storage'
import { useTheme } from '../lib/theme'

/**
 * Account, progress and access — one page that answers "who am I here".
 *
 * Two things live together on purpose:
 *
 *   - the ordinary account surface: who you are signed in as, what you have
 *     done, how to change your password or sign out;
 *   - what the SERVER thinks of this session, which is the only way to see why
 *     an admin route let you in or turned you away.
 *
 * They belong on the same page because the answer to "why can't I open /admin"
 * is almost always a fact about the account you happen to be signed in as, and
 * that fact was previously visible nowhere at all.
 *
 * Every progress figure is read from this browser's localStorage, because that
 * is the only place progress has ever been kept. Nothing here is fetched, and
 * nothing here has ever been uploaded.
 */

const pct = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100))

/** Days ticked in a track's progress map. */
const ticked = (p: SdProgress) => Object.values(p).filter(Boolean).length

interface Stats {
  /** Day 1 of this browser's run. */
  start: string
  dsa: CoreStats
  tracks: { name: string; done: number; total: number }[]
}

/** A figure that is not known yet, rather than a figure that is zero. */
const PENDING = '—'

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 rounded-full bg-ground border border-rule overflow-hidden mt-1.5">
      <div
        className="h-full bg-gradient-to-r from-brand to-brand-deep rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-3 min-w-0">
      <div className="eyebrow">{label}</div>
      <div className="font-mono text-2xl font-bold tabular-nums mt-1 leading-none">{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  )
}

function TrackRow({ name, done, total }: { name: string; done: number; total: number }) {
  const p = pct(done, total)
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium truncate">{name}</span>
        <span className="font-mono text-[11px] text-muted tabular-nums shrink-0">
          {done}/{total} · {p}%
        </span>
      </div>
      <Bar value={p} />
    </div>
  )
}

export default function Account() {
  const { status, me, signOut, openProfile } = useAuth()
  const { state: access, recheck } = useAccess()
  const stalled = useStalled(status === 'loading', 8_000)
  const { theme, toggle } = useTheme()
  const [signingOut, setSigningOut] = useState(false)

  /*
   * The curriculum is imported here rather than at the top of the file, and
   * that is deliberate.
   *
   * Four denominators — 140, 200, 130, 135 — are all this page wants from the
   * tracks, but a static import of them pulls the entire schedule, rail, AI/ML,
   * system-design and FDE datasets into this route's chunk. Roughly a megabyte
   * of question banks, to render four progress bars, blocking the first paint
   * of the identity and access cards above them. The access card is the reason
   * someone lands here when an admin route has turned them away; it must not
   * wait on a question bank.
   *
   * So the page draws immediately and the bars fill in a moment later. The
   * totals still come from the data itself, so they cannot drift from it.
   */
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      const [analytics, runStart, aiml, fde, sd, rail] = await Promise.all([
        import('../lib/analytics'),
        import('../lib/runStart'),
        import('../data/aiml'),
        import('../data/fde'),
        import('../data/systemDesign'),
        import('../data/track200'),
      ])
      if (!live) return
      const today = runStart.todayIso()
      const start = runStart.resolveStartDate(me?.signedUpOn ?? null, today)
      const schedule = runStart.shiftSchedule(start)
      const core = analytics.computeStats(schedule, loadLocal(), today)
      setStats({
        start,
        dsa: core,
        tracks: [
          /*
           * Every bar is progress through the whole track, DSA included. Using
           * elapsed days as the denominator instead would read "0/1" on day one
           * — technically "nothing done of one day so far", but next to four
           * rows measured against their full length it just looks wrong.
           */
          { name: 'DSA — 140 days', done: core.daysDone, total: schedule.length },
          { name: 'Backend 200', done: ticked(loadRail()), total: rail.RAIL_TOTAL_DAYS },
          { name: 'System design', done: ticked(loadSd()), total: sd.SD_TOTAL_DAYS },
          { name: 'AI/ML engineering', done: ticked(loadAiml()), total: aiml.AIML_TOTAL_DAYS },
          {
            name: 'Forward-deployed engineering',
            done: ticked(loadFde()),
            total: fde.FDE_TOTAL_DAYS,
          },
        ],
      })
    })()
    return () => {
      live = false
    }
    // signedUpOn is the only input, and it settles once when Clerk loads.
  }, [me?.signedUpOn])

  const download = () => {
    const blob = new Blob([exportJSON(loadLocal())], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backend200-progress-${iso(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (status === 'loading') return <CheckingAccount stalled={stalled} />
  if (status === 'signed-out') return <Navigate to="/signin" replace />

  /*
   * With accounts switched off there is no identity to show — but the progress
   * below is still real and still this browser's, so the page stays useful
   * rather than redirecting away from it.
   */
  const anonymous = status === 'unconfigured'

  const dsa = stats?.dsa ?? null
  const consistency = !dsa || dsa.elapsed === 0 ? 0 : pct(dsa.daysDone, dsa.elapsed)

  return (
    <div className="min-h-full px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <span className="eyebrow">account</span>
            <h1 className="font-display text-xl font-bold mt-0.5">You</h1>
          </div>
          <div className="flex items-center gap-2">
            {access.phase === 'ready' && access.who.isAdmin && (
              <Link className="btn text-xs" to="/admin">
                Operations
              </Link>
            )}
            {access.phase === 'ready' && access.who.isSuperAdmin && (
              <Link className="btn text-xs" to="/super">
                Signups
              </Link>
            )}
            <Link className="btn btn-primary text-xs" to="/app">
              Dashboard
            </Link>
          </div>
        </div>

        {/* ------------------------------ identity ------------------------------ */}
        <div className="card p-4">
          {anonymous ? (
            <div className="space-y-2">
              <p className="text-[12px] text-muted">
                This build runs without accounts, so there is nobody to sign out. Your progress is
                stored in this browser and nothing is sent anywhere.
              </p>
              <Link className="btn btn-primary text-xs" to="/app">
                Back to the dashboard
              </Link>
            </div>
          ) : (
            <div className="flex items-start gap-4 flex-wrap">
              {me?.avatarUrl ? (
                <img
                  src={me.avatarUrl}
                  alt=""
                  className="w-14 h-14 rounded-xl border border-rule object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand to-brand-deep grid place-items-center shrink-0">
                  <span className="font-display font-bold text-on-accent text-lg">
                    {(me?.fullName ?? me?.email ?? '?').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-bold truncate">
                  {me?.fullName ?? 'Signed in'}
                </div>
                <div className="font-mono text-[12px] text-muted break-all">{me?.email}</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {access.phase === 'ready' && access.who.isSuperAdmin && (
                    <Tag tone="text-brand border-brand/40 bg-brand/10">super admin</Tag>
                  )}
                  {access.phase === 'ready' && access.who.isAdmin && (
                    <Tag tone="text-ac border-ac/40 bg-ac/10">admin</Tag>
                  )}
                  {access.phase === 'ready' && !access.who.emailVerified && (
                    <Tag tone="text-miss border-miss/40 bg-miss/10">email unverified</Tag>
                  )}
                  {me?.signedUpOn && (
                    <Tag tone="text-muted border-rule bg-ground">
                      joined {fmtDay(me.signedUpOn)}
                    </Tag>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {openProfile && (
                  <button className="btn text-xs" onClick={openProfile}>
                    Manage account
                  </button>
                )}
                <button
                  className="btn text-xs border-miss/40 text-miss hover:border-miss"
                  disabled={signingOut}
                  onClick={() => {
                    setSigningOut(true)
                    void signOut().finally(() => setSigningOut(false))
                  }}
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------- stats -------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            label="problems solved"
            value={dsa ? `${dsa.solved}` : PENDING}
            sub={dsa ? `of ${dsa.totalUnique} in the plan` : undefined}
          />
          <Stat
            label="current streak"
            value={dsa ? `${dsa.streak}` : PENDING}
            sub="consecutive days"
          />
          <Stat
            label="hours logged"
            value={dsa ? dsa.hours.toFixed(1) : PENDING}
            sub={dsa ? `${dsa.contests} contests` : undefined}
          />
          <Stat
            label="consistency"
            value={dsa ? `${consistency}%` : PENDING}
            sub={dsa ? `${dsa.daysDone} done of ${dsa.elapsed} elapsed` : undefined}
          />
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">every track</span>
            <span className="font-mono text-[10px] text-muted">
              {stats ? `day 1 was ${fmtDay(stats.start)}` : 'reading your progress…'}
            </span>
          </div>
          {stats && dsa ? (
            <>
              {stats.tracks.map((t) => (
                <TrackRow key={t.name} name={t.name} done={t.done} total={t.total} />
              ))}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Stat label="easy" value={`${dsa.byDiff.Easy}`} />
                <Stat label="medium" value={`${dsa.byDiff.Medium}`} />
                <Stat label="hard" value={`${dsa.byDiff.Hard}`} />
              </div>
            </>
          ) : (
            <div className="space-y-3" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-1.5 rounded-full bg-ground border border-rule" />
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------ settings ------------------------------ */}
        <div className="card p-4 space-y-3">
          <span className="eyebrow">settings</span>

          <Setting
            title="Appearance"
            note={`Currently ${theme}. Stored in this browser.`}
            action={
              <button className="btn text-xs" onClick={toggle}>
                Switch to {theme === 'dark' ? 'light' : 'dark'}
              </button>
            }
          />

          <Setting
            title="Export your progress"
            note="A JSON file of every day you have logged. It is the only copy that leaves this browser, and only because you asked."
            action={
              <button className="btn text-xs" onClick={download}>
                Download
              </button>
            }
          />

          {openProfile && (
            <Setting
              title="Password, email and two-factor"
              note="Handled by Clerk in its own dialog, so no password ever passes through this app. Turning on two-factor is the single biggest gain for the admin account."
              action={
                <button className="btn text-xs" onClick={openProfile}>
                  Open
                </button>
              }
            />
          )}
        </div>

        {/* ------------------------------- access ------------------------------- */}
        {!anonymous && (
          <div className="card p-4 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="eyebrow">access</span>
              <button className="btn text-xs" onClick={recheck}>
                Re-check
              </button>
            </div>

            {access.phase === 'loading' && (
              <p className="text-[12px] text-muted">Asking the server…</p>
            )}

            {access.phase === 'unreachable' && (
              <>
                <p className="text-[12px] text-miss">{access.message}</p>
                <p className="text-[11px] text-muted">
                  The admin routes need the functions in <code className="font-mono">api/</code>,
                  which only the Vercel deployment runs. On GitHub Pages this will always fail and
                  the admin routes will always refuse.
                </p>
              </>
            )}

            {access.phase === 'expired' && (
              <>
                <p className="text-[12px] text-miss">{access.message}</p>
                <Link className="btn btn-primary text-xs" to="/signin">
                  Sign in again
                </Link>
              </>
            )}

            {access.phase === 'ready' && (
              <>
                <p className="text-[12px] text-muted">{access.who.verdict}</p>
                <AccessFacts state={access} />
                <p className="text-[11px] text-muted">
                  These come from the server, not from this page. If “admin” says no while you
                  expected yes, the address above is the one to compare against{' '}
                  <code className="font-mono">ADMIN_EMAILS</code> in the host's environment
                  variables.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const Tag = ({ tone, children }: { tone: string; children: React.ReactNode }) => (
  <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border ${tone}`}>
    {children}
  </span>
)

function Setting({
  title,
  note,
  action,
}: {
  title: string
  note: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-rule/50 last:border-0">
      <div className="min-w-0">
        <div className="text-[12px] font-medium">{title}</div>
        <p className="text-[11px] text-muted mt-0.5">{note}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}
