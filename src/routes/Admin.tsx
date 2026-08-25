import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/supabase'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  has_paid: boolean
  paid_at: string | null
  created_at: string
  last_seen_at: string
  successful_payments: number
  failed_payments: number
}

interface AdminPayment {
  email: string
  razorpay_order_id: string
  razorpay_payment_id: string | null
  status: 'created' | 'paid' | 'failed'
  amount: number
  currency: string
  confirmed_by: 'verify' | 'webhook' | null
  created_at: string
}

interface AdminData {
  users: AdminUser[]
  payments: AdminPayment[]
  totals: {
    signedUp: number
    paid: number
    revenueRupees: number
    conversionPct: number
    failed: number
  }
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const STATUS_TONE: Record<AdminPayment['status'], string> = {
  paid: 'text-ac border-ac/40 bg-ac/10',
  failed: 'text-miss border-miss/40 bg-miss/10',
  created: 'text-warn border-warn/40 bg-warn/10',
}

/**
 * The super-admin surface.
 *
 * This component renders nothing sensitive on its own — every figure comes from
 * /api/admin, which checks the caller against the admins table server-side. A
 * non-admin who types this URL gets a 404 from the API and an empty page; they
 * do not get the data and then have it hidden by CSS.
 */
export default function Admin() {
  const { status, me } = useAuth()
  const [tab, setTab] = useState<'people' | 'payments'>('people')
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await api<AdminData>('/api/admin'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load admin data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'signed-in') void load()
  }, [status, load])

  const paidUsers = useMemo(() => data?.users.filter((u) => u.has_paid) ?? [], [data])

  if (status === 'loading') return <Centered>Checking your account…</Centered>
  if (status !== 'signed-in') return <Navigate to="/signin" replace />
  // Belt and braces: the API is the real gate, this just avoids a pointless render.
  if (me && !me.isAdmin) return <Navigate to="/app" replace />

  return (
    <div className="min-h-full px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <span className="eyebrow">super admin</span>
            <h1 className="font-display text-xl font-bold mt-0.5">Backend 200 — operations</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn text-xs" onClick={() => void load()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link className="btn text-xs" to="/app">
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="card p-3 border-miss/40">
            <p className="text-[12px] text-miss">{error}</p>
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Metric label="signed up" value={`${data.totals.signedUp}`} />
              <Metric label="paid" value={`${data.totals.paid}`} tone="text-ac" />
              <Metric
                label="conversion"
                value={`${data.totals.conversionPct}%`}
                tone={data.totals.conversionPct >= 20 ? 'text-ac' : 'text-warn'}
              />
              <Metric label="revenue" value={`₹${data.totals.revenueRupees.toFixed(0)}`} />
              <Metric
                label="failed payments"
                value={`${data.totals.failed}`}
                tone={data.totals.failed > 0 ? 'text-miss' : undefined}
              />
            </div>

            <div className="card p-2 flex flex-wrap gap-2">
              <button
                onClick={() => setTab('people')}
                className={`btn text-xs ${tab === 'people' ? 'btn-primary' : ''}`}
              >
                Who signed in {data.users.length}
              </button>
              <button
                onClick={() => setTab('payments')}
                className={`btn text-xs ${tab === 'payments' ? 'btn-primary' : ''}`}
              >
                Payments {data.payments.length}
              </button>
            </div>

            {tab === 'people' && (
              <div className="card p-3">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="eyebrow">everyone who has signed in</span>
                  <span className="font-mono text-[10px] text-muted">
                    {paidUsers.length} paid of {data.users.length}
                  </span>
                </div>
                <Scroller>
                  <table className="w-full text-[12px]">
                    <thead className="text-muted">
                      <tr className="text-left border-b border-rule">
                        <Th>Email</Th>
                        <Th>Name</Th>
                        <Th>Status</Th>
                        <Th>Signed up</Th>
                        <Th>Last seen</Th>
                        <Th>Paid at</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((u) => (
                        <tr key={u.id} className="border-b border-rule/50">
                          <Td mono>{u.email}</Td>
                          <Td>{u.full_name ?? '—'}</Td>
                          <Td>
                            <Badge tone={u.has_paid ? STATUS_TONE.paid : 'text-muted border-rule bg-ground'}>
                              {u.has_paid ? 'paid' : 'free'}
                            </Badge>
                            {u.failed_payments > 0 && (
                              <span className="ml-1.5 font-mono text-[10px] text-miss">
                                {u.failed_payments} failed
                              </span>
                            )}
                          </Td>
                          <Td>{when(u.created_at)}</Td>
                          <Td>{when(u.last_seen_at)}</Td>
                          <Td>{when(u.paid_at)}</Td>
                        </tr>
                      ))}
                      {data.users.length === 0 && (
                        <tr>
                          <Td>Nobody has signed in yet.</Td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Scroller>
              </div>
            )}

            {tab === 'payments' && (
              <div className="card p-3">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="eyebrow">every payment attempt</span>
                  <span className="font-mono text-[10px] text-muted">
                    newest first · amounts in rupees
                  </span>
                </div>
                <Scroller>
                  <table className="w-full text-[12px]">
                    <thead className="text-muted">
                      <tr className="text-left border-b border-rule">
                        <Th>Email</Th>
                        <Th>Status</Th>
                        <Th>Amount</Th>
                        <Th>Order</Th>
                        <Th>Payment</Th>
                        <Th>Confirmed by</Th>
                        <Th>When</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((p) => (
                        <tr key={p.razorpay_order_id} className="border-b border-rule/50">
                          <Td mono>{p.email}</Td>
                          <Td>
                            <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                          </Td>
                          <Td mono>₹{(p.amount / 100).toFixed(2)}</Td>
                          <Td mono>{p.razorpay_order_id}</Td>
                          <Td mono>{p.razorpay_payment_id ?? '—'}</Td>
                          <Td>{p.confirmed_by ?? '—'}</Td>
                          <Td>{when(p.created_at)}</Td>
                        </tr>
                      ))}
                      {data.payments.length === 0 && (
                        <tr>
                          <Td>No payment attempts yet.</Td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Scroller>
                <p className="text-[11px] text-muted mt-2">
                  “Confirmed by” shows which path settled the payment. <strong>webhook</strong> is
                  the one to trust — it arrives from Razorpay's servers regardless of what the
                  user's browser did.
                </p>
              </div>
            )}
          </>
        )}

        {loading && !data && <Centered>Loading…</Centered>}
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card p-3 min-w-0">
      <div className="eyebrow">{label}</div>
      <div className={`font-mono text-2xl font-bold tabular-nums mt-1 leading-none ${tone ?? ''}`}>
        {value}
      </div>
    </div>
  )
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="font-medium py-1.5 pr-3 whitespace-nowrap">{children}</th>
)

const Td = ({ children, mono }: { children: React.ReactNode; mono?: boolean }) => (
  <td className={`py-1.5 pr-3 whitespace-nowrap ${mono ? 'font-mono text-[11px]' : ''}`}>
    {children}
  </td>
)

const Badge = ({ tone, children }: { tone: string; children: React.ReactNode }) => (
  <span className={`font-mono text-[9px] uppercase px-1 py-0.5 rounded border ${tone}`}>
    {children}
  </span>
)

/** Wide tables scroll inside the card rather than widening the page. */
const Scroller = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">{children}</div>
)

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-muted">{children}</p>
    </div>
  )
}
