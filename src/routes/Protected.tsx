import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/**
 * Route guard for the dashboard.
 *
 * This is a CONVENIENCE, not a security boundary. It decides what to render, so
 * a paying user is not shown a payment wall and a signed-out user is not shown
 * a spinner forever. The actual protection is that the content endpoint refuses
 * to serve anything without a valid session and a paid profile — flipping a
 * flag in devtools here gets you an empty dashboard, not a free one.
 */
export default function Protected({ children }: { children: React.ReactNode }) {
  const { status, me, error, refresh } = useAuth()

  if (status === 'unconfigured') {
    return (
      <Notice title="Not configured">
        This build has no Supabase credentials, so it cannot sign anyone in. Add{' '}
        <code className="font-mono text-[12px]">VITE_SUPABASE_URL</code> and{' '}
        <code className="font-mono text-[12px]">VITE_SUPABASE_ANON_KEY</code> to your hosting
        environment and redeploy.
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
  if (!me.hasPaid) return <Navigate to="/plans" replace />

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
