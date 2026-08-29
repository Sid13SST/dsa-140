import { useEffect } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { SignIn as ClerkSignIn, SignUp as ClerkSignUp } from '@clerk/clerk-react'
import { useAuth } from '../lib/auth'
import { clerkConfigured } from '../lib/clerk'
import { AUTH_ENABLED, PAYMENTS_ENABLED } from '../lib/flags'

/**
 * Sign in / sign up, rendered by Clerk.
 *
 * Using Clerk's prebuilt component rather than hand-rolling the form is the
 * whole reason for the move: it brings Google, email, verification, password
 * reset, MFA and the error states with it, and none of that is code worth
 * writing twice. It reads the app's own CSS variables so it does not look
 * bolted on, and follows the light/dark theme.
 */
export default function SignIn() {
  const { status, me } = useAuth()
  const [params] = useSearchParams()
  const signup = params.get('mode') === 'signup'

  useEffect(() => {
    document.title = signup ? 'Sign up — Backend 200' : 'Sign in — Backend 200'
  }, [signup])

  // Accounts are switched off, so there is nothing to sign in to.
  if (!AUTH_ENABLED) return <Navigate to="/app" replace />

  if (status === 'signed-in') {
    return <Navigate to={!PAYMENTS_ENABLED || me?.hasPaid ? '/app' : '/plans'} replace />
  }

  if (!clerkConfigured) {
    return (
      <Shell>
        <h1 className="font-display text-xl font-bold">Sign-in is not configured</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          This build has no <code className="font-mono text-[12px]">VITE_CLERK_PUBLISHABLE_KEY</code>
          . Nothing is broken — the app will not pretend to sign you in when it cannot.
        </p>
        {/* Build-time values: a running deploy cannot be fixed without rebuilding. */}
        <p className="text-[12px] text-muted mt-3 leading-relaxed">
          It is baked in at <strong>build</strong> time, so setting it means a redeploy. Get the
          key from the Clerk dashboard under API keys, then add it locally to{' '}
          <code className="font-mono text-[12px]">.env.local</code>, or to your host's environment
          variables.
        </p>
        <Link className="btn text-xs mt-4" to="/">
          &larr; Back
        </Link>
      </Shell>
    )
  }

  /*
   * Clerk styles itself from these variables, so it inherits the app's palette
   * in both themes rather than arriving as a white box in a dark page.
   */
  const appearance = {
    variables: {
      colorPrimary: 'rgb(var(--brand))',
      colorBackground: 'rgb(var(--surface))',
      colorText: 'rgb(var(--ink))',
      colorTextSecondary: 'rgb(var(--muted))',
      colorInputBackground: 'rgb(var(--ground))',
      colorInputText: 'rgb(var(--ink))',
      colorDanger: 'rgb(var(--miss))',
      colorSuccess: 'rgb(var(--ac))',
      borderRadius: '0.5rem',
    },
    elements: {
      card: 'shadow-none border border-rule',
      /*
       * Clerk's own footer is hidden because it repeats the site's branding
       * inside the card. It also carries the switch between signing in and
       * signing up, so that link is rebuilt below — without it, someone who
       * lands on /signin with no account has no way forward from this page.
       */
      footer: 'hidden',
    },
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-10 gap-4">
      <Link className="font-display font-bold text-lg tracking-tight" to="/">
        Backend<span className="text-brand">200</span>
      </Link>

      {signup ? (
        <ClerkSignUp appearance={appearance} signInUrl="/signin" />
      ) : (
        <ClerkSignIn appearance={appearance} signUpUrl="/signin?mode=signup" />
      )}

      <p className="text-[13px] text-muted">
        {signup ? (
          <>
            Already have an account?{' '}
            <Link className="text-brand font-medium hover:underline" to="/signin">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link className="text-brand font-medium hover:underline" to="/signin?mode=signup">
              Create an account
            </Link>
          </>
        )}
      </p>

      <p className="text-[11px] text-muted max-w-sm text-center leading-relaxed">
        Passwords, verification and multi-factor are handled by Clerk — none of it reaches this
        site. Your progress stays in your browser until you sign in.
      </p>

      <Link className="text-[12px] text-muted hover:text-ink" to="/">
        &larr; Back
      </Link>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="card p-6 w-full max-w-md">{children}</div>
    </div>
  )
}
