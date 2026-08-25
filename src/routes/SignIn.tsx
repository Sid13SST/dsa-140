import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { PAYMENTS_ENABLED } from '../lib/flags'

/**
 * Sign in and sign up are the same screen, because with Google they are the
 * same action — the first time you use it an account is created, after that it
 * signs you in. Showing two separate forms would be theatre.
 */
export default function SignIn() {
  const { status, me, signInWithGoogle } = useAuth()
  const [params] = useSearchParams()
  const signup = params.get('mode') === 'signup'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = signup ? 'Sign up — Backend 200' : 'Sign in — Backend 200'
  }, [signup])

  if (status === 'signed-in') {
    return <Navigate to={!PAYMENTS_ENABLED || me?.hasPaid ? '/app' : '/plans'} replace />
  }

  if (status === 'unconfigured') {
    return (
      <Shell>
        <h1 className="font-display text-xl font-bold">Sign-in is not configured</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          This build has no <code className="font-mono text-[12px]">VITE_SUPABASE_URL</code> or{' '}
          <code className="font-mono text-[12px]">VITE_SUPABASE_ANON_KEY</code>. Add them in your
          hosting environment and redeploy. Nothing is broken — the app simply will not pretend
          to sign you in when it cannot.
        </p>
      </Shell>
    )
  }

  const go = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
      // On success the browser leaves for Google, so nothing after this runs.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start sign-in')
      setBusy(false)
    }
  }

  return (
    <Shell>
      <span className="eyebrow">{signup ? 'create your account' : 'welcome back'}</span>
      <h1 className="font-display text-2xl font-bold mt-1">
        {signup ? 'Start the 200 days' : 'Sign in to Backend 200'}
      </h1>
      <p className="text-sm text-muted mt-2 leading-relaxed">
        {signup
          ? 'One click with Google. No password to invent, and no password for us to leak.'
          : 'Use the Google account you signed up with.'}
      </p>

      <button
        onClick={go}
        disabled={busy || status === 'loading'}
        className="btn btn-primary w-full mt-5 justify-center py-2.5"
      >
        {busy ? 'Opening Google…' : 'Continue with Google'}
      </button>

      {error && (
        <p className="text-[12px] text-miss mt-3" role="alert">
          {error}
        </p>
      )}

      <p className="text-[11px] text-muted mt-5 leading-relaxed">
        We receive your name, email and profile picture from Google. Nothing else, and no
        password ever reaches us. Payment is handled by Razorpay — card details never touch
        this site.
      </p>

      <div className="mt-5 pt-4 border-t border-rule flex items-center justify-between gap-2">
        <Link className="text-[12px] text-muted hover:text-ink" to="/">
          &larr; Back
        </Link>
        <Link
          className="text-[12px] text-brand-deep hover:underline"
          to={signup ? '/signin' : '/signin?mode=signup'}
        >
          {signup ? 'Already have an account?' : 'New here? Create an account'}
        </Link>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="card p-6 w-full max-w-md">{children}</div>
    </div>
  )
}
