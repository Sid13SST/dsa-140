import { useState } from 'react'
import { signInWithEmail } from '../lib/supabase'
import { ACCESS_PRICE_PAISE, createOrder, verifyPayment } from '../lib/account'
import type { Theme } from '../lib/theme'

const rupees = (paise: number) => `₹${(paise / 100).toFixed(0)}`

function Shell({
  children,
  theme,
  onToggleTheme,
}: {
  children: React.ReactNode
  theme: Theme
  onToggleTheme: () => void
}) {
  return (
    <div className="min-h-full grid place-items-center px-4 py-10">
      <button
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        className="fixed top-4 right-4 btn text-xs"
      >
        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
      </button>

      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-5 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-deep shadow-glow grid place-items-center">
            <span className="font-display font-bold text-on-accent text-sm">140</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight heading-gradient">
            DSA 140
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------- sign in -------------------------------- */

export function SignIn({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell theme={theme} onToggleTheme={onToggleTheme}>
      <div className="card p-5">
        {sent ? (
          <div className="text-center">
            <div className="text-3xl mb-2">📬</div>
            <h2 className="font-display font-bold text-lg">Check your inbox</h2>
            <p className="text-sm text-muted mt-1.5">
              We sent a sign-in link to <span className="text-ink font-medium">{email}</span>.
              Open it on this device to continue.
            </p>
            <button className="btn mt-4 text-xs" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-display font-bold text-lg">Sign in to your tracker</h2>
            <p className="text-sm text-muted mt-1">
              We'll email you a one-time link — no password to remember.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-2">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="field w-full"
                aria-label="Email address"
              />
              <button type="submit" className="btn btn-primary w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>
            {err && <p className="text-xs text-miss mt-2">{err}</p>}
            <p className="text-[11px] text-muted mt-4 pt-3 border-t border-rule">
              Full access is a one-time {rupees(ACCESS_PRICE_PAISE)} payment after sign-in.
            </p>
          </>
        )}
      </div>
    </Shell>
  )
}

/* -------------------------------- paywall -------------------------------- */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export function Paywall({
  email,
  theme,
  onToggleTheme,
  onPaid,
  onSignOut,
}: {
  email: string
  theme: Theme
  onToggleTheme: () => void
  onPaid: () => void
  onSignOut: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const pay = async () => {
    setErr(null)
    setBusy(true)
    try {
      if (!(await loadRazorpay())) {
        throw new Error('Could not load the payment window. Check your connection and retry.')
      }
      const order = await createOrder()

      await new Promise<void>((resolve, reject) => {
        const rz = new window.Razorpay!({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: 'DSA 140',
          description: 'Full dashboard access (one-time)',
          prefill: { email },
          theme: { color: '#4F46E5' },
          // Land the payer straight on UPI (PhonePe / GPay / Paytm). The default
          // blocks stay available underneath so card and netbanking still work
          // as a fallback — set show_default_blocks to false for UPI-only.
          config: {
            display: {
              blocks: {
                upi: {
                  name: 'Pay via UPI — PhonePe, GPay, Paytm',
                  instruments: [{ method: 'upi' }],
                },
              },
              sequence: ['block.upi'],
              preferences: { show_default_blocks: true },
            },
          },
          handler: async (r: Record<string, string>) => {
            try {
              await verifyPayment({
                razorpay_order_id: r.razorpay_order_id,
                razorpay_payment_id: r.razorpay_payment_id,
                razorpay_signature: r.razorpay_signature,
              })
              resolve()
            } catch (e) {
              reject(e)
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled.')),
          },
        })
        rz.open()
      })

      onPaid()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Payment failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell theme={theme} onToggleTheme={onToggleTheme}>
      <div className="card p-5">
        <span className="eyebrow">one-time unlock</span>
        <h2 className="font-display font-bold text-xl mt-1">
          Unlock the full tracker for {rupees(ACCESS_PRICE_PAISE)}
        </h2>
        <p className="text-sm text-muted mt-1.5">
          Signed in as <span className="text-ink font-medium">{email}</span>.
        </p>

        <ul className="mt-4 space-y-1.5 text-sm">
          {[
            'The full 140-day plan with 500+ curated problems',
            'Progress analytics, pace tracking and streaks',
            'Curated concept videos and references per topic',
            'Detailed PDF progress reports',
            'Contest tracking across LeetCode, Codeforces and CodeChef',
          ].map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-ac shrink-0">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <button className="btn btn-primary w-full mt-5" onClick={pay} disabled={busy}>
          {busy ? 'Opening payment…' : `Pay ${rupees(ACCESS_PRICE_PAISE)} and continue`}
        </button>

        {err && <p className="text-xs text-miss mt-2">{err}</p>}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-rule">
          <span className="text-[11px] text-muted">UPI, card or netbanking · Secured by Razorpay</span>
          <button className="text-[11px] text-muted hover:text-ink underline" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </Shell>
  )
}
