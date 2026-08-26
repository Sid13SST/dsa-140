import { useCallback, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { apiFetch, useAuth } from '../lib/auth'
import { PRICE_RUPEES } from '../lib/pricing'
import { PAYMENTS_ENABLED } from '../lib/flags'

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

/** Load Razorpay's checkout script once, on demand. */
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Could not load checkout')))
    })
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = CHECKOUT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'))
    document.body.appendChild(s)
  })
}

const INCLUDED = [
  '140-day DSA plan — 503 problems, dated, with daily topics',
  '200-day fundamentals rail — backend, databases, Linux, DevOps, design, AI/ML',
  '100 self-graded practice questions with rubrics',
  '48 AI mock interviews with a whiteboard and written grading',
  '8 weekend labs that link straight to the datasets and tools',
  'Run grid, contest tracker, analytics and a printable PDF report',
]

export default function Plans() {
  const { status, me, error: authError, refresh, signOut, getToken } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const pay = useCallback(async () => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await loadCheckout()

      // The server decides the amount. Nothing here can change what is charged.
      const order = await apiFetch<{
        orderId: string
        amount: number
        currency: string
        keyId: string
      }>('/api/order', getToken, { method: 'POST' })

      if (!window.Razorpay) throw new Error('Checkout did not load')

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Backend 200',
        description: 'Lifetime access',
        prefill: { email: me?.email ?? '', name: me?.fullName ?? '' },
        theme: { color: '#2563eb' },
        handler: async (r: Record<string, string>) => {
          setNote('Payment received — confirming…')
          try {
            await apiFetch('/api/verify', getToken, { method: 'POST', body: JSON.stringify(r) })
            await refresh()
            navigate('/app', { replace: true })
          } catch (e) {
            // The webhook is the reliable path, so a failure here is usually a
            // race rather than a lost payment. Say so instead of alarming them.
            setError(
              e instanceof Error
                ? `${e.message}. If money left your account, it will be confirmed within a minute — reload this page.`
                : 'Could not confirm the payment',
            )
            setBusy(false)
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false)
            setNote('Payment window closed. Nothing was charged.')
          },
        },
      })

      rzp.open()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the payment')
      setBusy(false)
    }
  }, [me, navigate, refresh, getToken])

  // The whole page is dormant until the paywall is switched back on.
  if (!PAYMENTS_ENABLED) return <Navigate to="/app" replace />
  if (status === 'loading') return <Centered>Checking your account…</Centered>
  if (status === 'signed-out') return <Navigate to="/signin" replace />
  if (status === 'unconfigured') return <Navigate to="/signin" replace />
  if (me?.hasPaid) return <Navigate to="/app" replace />

  return (
    <div className="min-h-full px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <span className="font-display font-bold text-lg">
            Backend<span className="text-brand">200</span>
          </span>
          <button className="text-[12px] text-muted hover:text-ink" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>

        {authError && (
          <div className="card p-3 mb-3 border-miss/40">
            <p className="text-[12px] text-miss">{authError}</p>
            <button className="btn text-xs mt-2" onClick={() => void refresh()}>
              Try again
            </button>
          </div>
        )}

        <div className="card p-5">
          <span className="eyebrow">one plan, one payment</span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="font-mono text-4xl font-bold tabular-nums">
              &#8377;{PRICE_RUPEES}
            </span>
            <span className="text-sm text-muted">once — lifetime access</span>
          </div>
          <p className="text-[12px] text-muted mt-2 leading-relaxed">
            No subscription, no renewal, no card stored. Signed in as{' '}
            <span className="text-ink">{me?.email}</span>.
          </p>

          <ul className="mt-4 space-y-1.5">
            {INCLUDED.map((line) => (
              <li key={line} className="flex gap-2 text-[13px]">
                <span className="text-ac shrink-0 font-mono">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => void pay()}
            disabled={busy}
            className="btn btn-primary w-full justify-center py-2.5 mt-5"
          >
            {busy ? 'Opening payment…' : `Pay ₹${PRICE_RUPEES} with Razorpay`}
          </button>

          {note && <p className="text-[12px] text-muted mt-3">{note}</p>}
          {error && (
            <p className="text-[12px] text-miss mt-3" role="alert">
              {error}
            </p>
          )}

          <p className="text-[11px] text-muted mt-4 leading-relaxed">
            Payment is handled entirely by Razorpay — UPI, cards, net banking and wallets. Your
            card details never reach this site. Access is granted by our server after Razorpay
            confirms the payment, so it holds even if you close this tab mid-payment.
          </p>
        </div>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <p className="text-sm text-muted">{children}</p>
    </div>
  )
}
