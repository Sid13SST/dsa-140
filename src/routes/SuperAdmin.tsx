import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { apiFetch, AuthExpiredError, useAuth } from '../lib/auth'
import { AUTH_ENABLED } from '../lib/flags'

/**
 * The super-admin dashboard.
 *
 * Separate from /admin on purpose. /admin is operations — accounts and payment
 * attempts — and its list can grow to whoever needs to cover it. This one
 * answers a different question, "who is signing up and are they coming back",
 * and stays with a single address. The gate is /api/insights, which checks
 * SUPER_ADMIN_EMAIL server-side and answers 404 to everyone else; the checks
 * in this file only decide what to draw.
 *
 * What it deliberately does NOT show: study progress. That lives in each
 * person's localStorage and is never sent anywhere, so this cannot know who is
 * actually solving problems — only who has an account and when they last came
 * back. Everything here is real Clerk data or it is absent.
 */

interface Person {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  lastSignInAt: string | null
  lastActiveAt: string | null
  signedUpWith: string
  emailVerified: boolean
  twoFactor: boolean
  banned: boolean
  locked: boolean
  daysActive: number
  neverReturned: boolean
}

interface Insights {
  generatedAt: string
  totals: {
    signedUp: number
    activeToday: number
    active7d: number
    active30d: number
    signedUp7d: number
    signedUp30d: number
    weekOverWeekPct: number | null
    verified: number
    twoFactor: number
    neverReturned: number
    suspended: number
  }
  byMethod: Record<string, number>
  series: { day: string; signups: number }[]
  people: Person[]
}

type Tab = 'signups' | 'insights'

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const ago = (iso: string | null) => {
  if (!iso) return 'never'
  const ms = Date.now() - Date.parse(iso)
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`
}

export default function SuperAdmin() {
  const { status, me, getToken } = useAuth()
  const [tab, setTab] = useState<Tab>('signups')
  const [data, setData] = useState<Insights | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await apiFetch<Insights>('/api/insights', getToken))
    } catch (e) {
      if (e instanceof AuthExpiredError) {
        setExpired(true)
        setData(null)
        return
      }
      setError(e instanceof Error ? e.message : 'Could not load insights')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    if (status === 'signed-in') void load()
  }, [status, load])

  const people = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) return data.people
    return data.people.filter(
      (p) => p.email.toLowerCase().includes(q) || (p.name ?? '').toLowerCase().includes(q),
    )
  }, [data, query])

  if (!AUTH_ENABLED) return <Navigate to="/app" replace />
  if (status === 'loading') return <Centered>Checking your account…</Centered>
  if (status !== 'signed-in' || expired) return <Navigate to="/signin" replace />
  // The endpoint is the real gate. This only avoids drawing a page that will 404.
  if (me && !me.isSuperAdmin) return <Navigate to="/app" replace />

  const t = data?.totals

  return (
    <div className="min-h-full px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <span className="eyebrow">super admin · {me?.email}</span>
            <h1 className="font-display text-xl font-bold mt-0.5">Signups &amp; insights</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn text-xs" onClick={() => void load()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link className="btn text-xs" to="/admin">
              Operations
            </Link>
            <Link className="btn text-xs" to="/app">
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="card p-3 border-miss/40">
            <p className="text-[12px] text-miss">{error}</p>
            <p className="text-[11px] text-muted mt-1">
              This page needs the serverless functions, so it only works on the Vercel
              deployment — GitHub Pages cannot run <code>api/</code>.
            </p>
          </div>
        )}

        {loading && !data && <div className="card p-4 text-sm text-muted">Loading…</div>}

        {data && t && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Metric label="signed up" value={`${t.signedUp}`} sub="all time" />
              <Metric
                label="this week"
                value={`${t.signedUp7d}`}
                sub={
                  t.weekOverWeekPct === null
                    ? 'no prior week'
                    : `${t.weekOverWeekPct >= 0 ? '+' : ''}${t.weekOverWeekPct}% vs last`
                }
                tone={
                  t.weekOverWeekPct === null
                    ? undefined
                    : t.weekOverWeekPct >= 0
                      ? 'text-ac'
                      : 'text-warn'
                }
              />
              <Metric label="active today" value={`${t.activeToday}`} tone="text-ac" sub="signed in" />
              <Metric label="active 7d" value={`${t.active7d}`} sub={`${t.active30d} in 30d`} />
              <Metric
                label="never returned"
                value={`${t.neverReturned}`}
                sub="signed up, left"
                tone={t.neverReturned > 0 ? 'text-warn' : undefined}
              />
            </div>

            <div className="card p-2 flex flex-wrap gap-2">
              <button
                onClick={() => setTab('signups')}
                className={`btn text-xs ${tab === 'signups' ? 'btn-primary' : ''}`}
              >
                Who signed up {data.people.length}
              </button>
              <button
                onClick={() => setTab('insights')}
                className={`btn text-xs ${tab === 'insights' ? 'btn-primary' : ''}`}
              >
                Insights
              </button>
            </div>

            {tab === 'signups' && (
              <div className="card p-3">
                <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
                  <span className="eyebrow">every account, newest first</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by email or name"
                    className="bg-ground border border-rule rounded px-2 py-1 text-[12px]
                      min-w-[200px] focus:outline-none focus:ring-2 focus:ring-brand/50"
                  />
                </div>
                <Scroller>
                  <table className="w-full text-[12px]">
                    <thead className="text-muted">
                      <tr className="text-left border-b border-rule">
                        <Th>Person</Th>
                        <Th>Signed up</Th>
                        <Th>Via</Th>
                        <Th>Last seen</Th>
                        <Th>Stayed</Th>
                        <Th>Account</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {people.map((p) => (
                        <tr key={p.id} className="border-b border-rule/50">
                          <Td>
                            <span className="font-mono">{p.email}</span>
                            {p.name && <span className="text-muted ml-1.5">{p.name}</span>}
                          </Td>
                          <Td>{when(p.createdAt)}</Td>
                          <Td>
                            <Badge tone="text-muted border-rule bg-ground">{p.signedUpWith}</Badge>
                          </Td>
                          <Td>
                            <span className={p.neverReturned ? 'text-warn' : undefined}>
                              {ago(p.lastActiveAt)}
                            </span>
                          </Td>
                          <Td>
                            {p.neverReturned ? (
                              <span className="text-warn">never came back</span>
                            ) : (
                              `${p.daysActive}d`
                            )}
                          </Td>
                          <Td>
                            <div className="flex gap-1 flex-wrap">
                              {!p.emailVerified && (
                                <Badge tone="text-warn border-warn/40 bg-warn/10">unverified</Badge>
                              )}
                              {p.twoFactor && (
                                <Badge tone="text-ac border-ac/40 bg-ac/10">mfa</Badge>
                              )}
                              {p.banned && (
                                <Badge tone="text-miss border-miss/40 bg-miss/10">banned</Badge>
                              )}
                              {p.locked && (
                                <Badge tone="text-miss border-miss/40 bg-miss/10">locked</Badge>
                              )}
                              {p.emailVerified && !p.twoFactor && !p.banned && !p.locked && (
                                <span className="text-muted">ok</span>
                              )}
                            </div>
                          </Td>
                        </tr>
                      ))}
                      {people.length === 0 && (
                        <tr>
                          <Td>{query ? 'Nobody matches that filter.' : 'Nobody has signed up yet.'}</Td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Scroller>
              </div>
            )}

            {tab === 'insights' && (
              <div className="space-y-3">
                <SignupChart series={data.series} />

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="card p-3">
                    <span className="eyebrow">how they signed up</span>
                    <ul className="mt-2 space-y-1.5">
                      {Object.entries(data.byMethod)
                        .sort((a, b) => b[1] - a[1])
                        .map(([method, count]) => (
                          <Bar
                            key={method}
                            label={method}
                            count={count}
                            total={t.signedUp}
                            tone="bg-brand"
                          />
                        ))}
                      {Object.keys(data.byMethod).length === 0 && (
                        <li className="text-[12px] text-muted">No accounts yet.</li>
                      )}
                    </ul>
                  </div>

                  <div className="card p-3">
                    <span className="eyebrow">account health</span>
                    <ul className="mt-2 space-y-1.5">
                      <Bar
                        label="email verified"
                        count={t.verified}
                        total={t.signedUp}
                        tone="bg-ac"
                      />
                      <Bar
                        label="multi-factor on"
                        count={t.twoFactor}
                        total={t.signedUp}
                        tone="bg-ac"
                      />
                      <Bar
                        label="came back at least once"
                        count={t.signedUp - t.neverReturned}
                        total={t.signedUp}
                        tone="bg-brand"
                      />
                      <Bar
                        label="suspended or locked"
                        count={t.suspended}
                        total={t.signedUp}
                        tone="bg-miss"
                      />
                    </ul>
                  </div>
                </div>

                <p className="text-[11px] text-muted leading-relaxed px-1">
                  Everything here comes from Clerk. Study progress is kept in each person&apos;s
                  own browser and never leaves it, so this cannot show who is actually solving
                  problems — only who has an account, how they made it, and when they last came
                  back. Generated {when(data.generatedAt)}.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** Thirty days of signups. Bars, because the numbers are small and countable. */
function SignupChart({ series }: { series: { day: string; signups: number }[] }) {
  const peak = Math.max(1, ...series.map((s) => s.signups))
  const total = series.reduce((n, s) => n + s.signups, 0)

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between mb-3">
        <span className="eyebrow">signups · last 30 days</span>
        <span className="font-mono text-[10px] text-muted">
          {total} total · peak {peak}/day
        </span>
      </div>
      <div className="flex items-end gap-[3px] h-24" role="img" aria-label={`${total} signups over the last 30 days`}>
        {series.map((point) => (
          <div
            key={point.day}
            className="flex-1 min-w-0 flex flex-col justify-end h-full"
            title={`${point.day}: ${point.signups} signup${point.signups === 1 ? '' : 's'}`}
          >
            <div
              className={`rounded-t ${point.signups > 0 ? 'bg-brand' : 'bg-rule'}`}
              style={{ height: point.signups > 0 ? `${(point.signups / peak) * 100}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 font-mono text-[10px] text-muted">
        <span>{series[0]?.day.slice(5)}</span>
        <span>{series[series.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  )
}

function Bar({
  label,
  count,
  total,
  tone,
}: {
  label: string
  count: number
  total: number
  tone: string
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <li>
      <div className="flex items-baseline justify-between text-[12px]">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-muted">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-1.5 mt-1 rounded-full bg-ground overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  )
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: string
}) {
  return (
    <div className="card p-3">
      <div className="eyebrow leading-none">{label}</div>
      <div className={`font-mono text-2xl font-bold mt-1.5 leading-none ${tone ?? 'text-ink'}`}>
        {value}
      </div>
      {sub && <div className="font-mono text-[10px] text-muted mt-1">{sub}</div>}
    </div>
  )
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="font-medium py-1.5 pr-3 whitespace-nowrap">{children}</th>
)

const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="py-1.5 pr-3 align-top">{children}</td>
)

const Badge = ({ tone, children }: { tone: string; children: React.ReactNode }) => (
  <span className={`inline-block font-mono text-[10px] px-1.5 py-0.5 rounded border ${tone}`}>
    {children}
  </span>
)

const Scroller = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">{children}</div>
)

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-full flex items-center justify-center px-4 py-10">
    <p className="text-sm text-muted">{children}</p>
  </div>
)
