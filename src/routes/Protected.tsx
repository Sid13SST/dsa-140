import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { AUTH_ENABLED, PAYMENTS_ENABLED } from '../lib/flags'

/**
 * Route guard for the dashboard.
 *
 * This is a CONVENIENCE, not a security boundary. It decides what to render, so
 * a paying user is not shown a payment wall and a signed-out user is not left
 * on a spinner. Every protected endpoint verifies the Clerk token for itself,
 * so flipping a flag in devtools changes what you SEE and not what the server
 * will hand over.
 */
export default function Protected({ children }: { children: React.ReactNode }) {
  const { status, me, error, refresh } = useAuth()

  // No accounts, no gate. Progress lives in localStorage exactly as it did
  // before any of this existed.
  if (!AUTH_ENABLED) return <>{children}</>

  if (status === 'unconfigured') {
    return (
      <Notice title="Not configured">
        Accounts are switched on but this build has no{' '}
        <code className="font-mono text-[12px]">VITE_CLERK_PUBLISHABLE_KEY</code>, so it cannot
        sign anyone in. Add the key and redeploy, or set{' '}
        <code className="font-mono text-[12px]">VITE_AUTH_ENABLED=false</code> to open the
        dashboard without an account.
      </Notice>
    )
  }

  if (status === 'loading') return <Notice title="One moment">Checking your account…</Notice>
  if (status === 'signed-out') return <Navigate to="/signin" replace />

  // The server could not tell us who you are. Fail closed and say why, rather
  // than guessing — guessing "paid" gives it away, guessing "unpaid" is a lie.
  if (error) {
    return (
      <Notice title="Could not reach your account">
        {error}
        <button className="btn text-xs mt-3" onClick={() => void refresh()}>
          Try again
        </button>
      </Notice>
    )
  }

  if (!me) return <Notice title="One moment">Loading your account…</Notice>
  // With the paywall off, being signed in is the whole requirement.
  if (PAYMENTS_ENABLED && !me.hasPaid) return <Navigate to="/plans" replace />

  return <>{children}</>
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="card p-5 max-w-md text-center">
        <h1 className="font-display font-bold text-lg">{title}</h1>
        <div className="text-sm text-muted mt-2 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
