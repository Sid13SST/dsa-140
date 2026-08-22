import { useEffect, useState } from 'react'
import {
  fetchAdminUsers,
  fetchLoginEvents,
  fetchPayments,
  type AdminUserRow,
  type LoginEvent,
  type PaymentRow,
} from '../lib/account'

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '—'

const rupees = (paise: number) => `₹${(paise / 100).toFixed(0)}`

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className="font-mono text-2xl font-bold tabular-nums mt-0.5 leading-none">{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  )
}

export default function AdminPanel() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [logins, setLogins] = useState<LoginEvent[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [view, setView] = useState<'users' | 'logins' | 'payments'>('users')

  const load = () => {
    setLoading(true)
    setErr(null)
    Promise.all([fetchAdminUsers(), fetchLoginEvents(), fetchPayments()])
      .then(([u, l, p]) => {
        setUsers(u)
        setLogins(l)
        setPayments(p)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Could not load admin data.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const paidUsers = users.filter((u) => u.has_paid && u.role !== 'admin')
  const revenuePaise = payments
    .filter((p) => p.status === 'paid')
    .reduce((n, p) => n + p.amount_paise, 0)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="total users" value={`${users.length}`} sub="signed up" />
        <Stat label="paid users" value={`${paidUsers.length}`} sub="unlocked access" />
        <Stat label="revenue" value={rupees(revenuePaise)} sub={`${payments.filter((p) => p.status === 'paid').length} payments`} />
        <Stat label="logins" value={`${logins.length}`} sub="recent events" />
      </div>

      <div className="card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex gap-1">
            {(['users', 'logins', 'payments'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`btn text-xs capitalize ${view === v ? 'btn-primary' : ''}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="btn text-xs" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {err && (
          <p className="text-xs text-miss mb-2">
            {err} — check that schema.sql has been run and you're signed in as the admin.
          </p>
        )}

        <div className="overflow-x-auto">
          {view === 'users' && (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left border-b border-rule">
                  {['Email', 'Role', 'Access', 'Logins', 'Last login', 'Joined'].map((h) => (
                    <th key={h} className="eyebrow py-1.5 pr-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-1.5 pr-3 truncate max-w-[220px]">{u.email}</td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                          u.role === 'admin'
                            ? 'text-brand-deep border-brand/40 bg-brand/10'
                            : 'text-muted border-rule'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3">
                      <span className={u.has_paid ? 'text-ac' : 'text-warn'}>
                        {u.has_paid ? '✓ unlocked' : 'unpaid'}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{u.login_count}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-muted">
                      {fmt(u.last_login_at)}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-muted">
                      {fmt(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === 'logins' && (
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left border-b border-rule">
                  {['Email', 'When', 'Device'].map((h) => (
                    <th key={h} className="eyebrow py-1.5 pr-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {logins.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5 pr-3 truncate max-w-[220px]">{l.email}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-muted">
                      {fmt(l.occurred_at)}
                    </td>
                    <td className="py-1.5 pr-3 text-xs text-muted truncate max-w-[260px]">
                      {l.user_agent ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === 'payments' && (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left border-b border-rule">
                  {['Email', 'Amount', 'Status', 'Payment ID', 'When'].map((h) => (
                    <th key={h} className="eyebrow py-1.5 pr-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 pr-3 truncate max-w-[200px]">{p.email}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{rupees(p.amount_paise)}</td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={
                          p.status === 'paid'
                            ? 'text-ac'
                            : p.status === 'failed'
                              ? 'text-miss'
                              : 'text-warn'
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-[10px] text-muted truncate max-w-[180px]">
                      {p.razorpay_payment_id ?? '—'}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-muted">
                      {fmt(p.paid_at ?? p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && !err && (
          <>
            {view === 'users' && users.length === 0 && (
              <p className="text-sm text-muted py-3">No users yet.</p>
            )}
            {view === 'logins' && logins.length === 0 && (
              <p className="text-sm text-muted py-3">No sign-ins recorded yet.</p>
            )}
            {view === 'payments' && payments.length === 0 && (
              <p className="text-sm text-muted py-3">No payments yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
