import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AccessState } from '../lib/access'

/**
 * Why you are not looking at the admin console.
 *
 * Previously both admin routes answered this question with a silent redirect to
 * /app. Every distinct cause — wrong address signed in, email not verified,
 * ADMIN_EMAILS pointing somewhere else on the host, the functions missing from
 * the deployment — produced exactly the same thing on screen: the dashboard.
 * There was no way to tell them apart, from the outside or the inside, which is
 * why "/admin isn't working" took three attempts to pin down.
 *
 * Now each one says which it is, and what to do about it.
 */

/** True once `active` has stayed true for `ms` without resolving. */
export function useStalled(active: boolean, ms: number): boolean {
  const [stalled, setStalled] = useState(false)
  useEffect(() => {
    if (!active) {
      setStalled(false)
      return
    }
    const t = setTimeout(() => setStalled(true), ms)
    return () => clearTimeout(t)
  }, [active, ms])
  return stalled
}

export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-full px-4 py-10">
      <div className="max-w-lg mx-auto card p-5 space-y-3">
        <span className="eyebrow">access</span>
        <h1 className="font-display text-lg font-bold">{title}</h1>
        {children}
      </div>
    </div>
  )
}

const Row = ({ label, value, ok }: { label: string; value: string; ok?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3 py-1 border-b border-rule/50 last:border-0">
    <span className="text-[11px] text-muted shrink-0">{label}</span>
    <span
      className={`font-mono text-[11px] text-right break-all ${
        ok === undefined ? '' : ok ? 'text-ac' : 'text-miss'
      }`}
    >
      {value}
    </span>
  </div>
)

/**
 * The facts the server reported about this session, laid out plainly.
 *
 * The admin rows are NOT for everyone. Exactly one address is admin and super
 * admin, so to anyone else "admin — no / super admin — no" says nothing they
 * could act on, and quietly undoes the reason /api/admin answers 404 rather
 * than 403: a page that tells you there is an admin console you failed to
 * reach has confirmed the console exists.
 *
 * So they appear in two places only — for an admin, and on a refusal page,
 * which you only see by deliberately asking for /admin or /super. Everyone
 * else sees who they are signed in as and nothing about roles at all.
 */
export function AccessFacts({
  state,
  showRoles,
}: {
  state: AccessState
  /** Defaults to "only if they are an admin". The refusal page overrides it. */
  showRoles?: boolean
}) {
  if (state.phase !== 'ready') return null
  const { who } = state
  const roles = showRoles ?? who.isAdmin
  return (
    <div className="rounded-lg border border-rule bg-ground/60 px-3 py-2">
      <div className="eyebrow mb-1">what the server sees</div>
      <Row label="signed in as" value={who.email || '(no address)'} />
      <Row label="email verified" value={who.emailVerified ? 'yes' : 'no'} ok={who.emailVerified} />
      {roles && (
        <>
          <Row label="admin" value={who.isAdmin ? 'yes' : 'no'} ok={who.isAdmin} />
          <Row label="super admin" value={who.isSuperAdmin ? 'yes' : 'no'} ok={who.isSuperAdmin} />
          {/* Present for admins only, so a refused non-admin sees the two rows
              above — which are the ones that actually diagnose their case — and
              nothing about how the server is configured. */}
          {who.server && (
            <>
              <Row
                label="admin list set"
                value={who.server.adminListConfigured ? 'yes' : 'using default'}
              />
              <Row
                label="authorized parties"
                value={who.server.authorizedPartiesConfigured ? 'set' : 'not set'}
                ok={who.server.authorizedPartiesConfigured}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

/**
 * A full-page refusal that names the reason.
 *
 * `need` is the surface that was asked for; the server's own verdict decides
 * whether it was granted, and this only explains the answer.
 */
export function AccessNotice({
  need,
  state,
  onRetry,
}: {
  need: 'admin' | 'super'
  state: AccessState
  onRetry: () => void
}) {
  const surface = need === 'super' ? '/super' : '/admin'

  if (state.phase === 'no-auth') {
    return (
      <Shell title="Accounts are switched off in this build">
        <p className="text-[12px] text-muted">
          {surface} identifies you by your Clerk session, and this build was compiled with{' '}
          <code className="font-mono text-[11px]">VITE_AUTH_ENABLED</code> unset, so there is no
          session to check. Set it to <code className="font-mono text-[11px]">true</code> alongside{' '}
          <code className="font-mono text-[11px]">VITE_CLERK_PUBLISHABLE_KEY</code> and redeploy —
          both are read at build time, so changing them needs a rebuild.
        </p>
        <Link className="btn btn-primary text-xs" to="/app">
          Back to the dashboard
        </Link>
      </Shell>
    )
  }

  if (state.phase === 'expired') {
    return (
      <Shell title="Sign in again">
        <p className="text-[12px] text-muted">{state.message}</p>
        <p className="text-[11px] text-muted">
          The admin console asks for a first factor proved within the last hour, so a session left
          open overnight lands here even though it still works everywhere else.
        </p>
        <div className="flex gap-2">
          <Link className="btn btn-primary text-xs" to="/signin">
            Sign in
          </Link>
          <Link className="btn text-xs" to="/app">
            Dashboard
          </Link>
        </div>
      </Shell>
    )
  }

  if (state.phase === 'unreachable') {
    return (
      <Shell title="Could not ask the server">
        <p className="text-[12px] text-miss">{state.message}</p>
        <p className="text-[11px] text-muted">
          {surface} needs the functions in <code className="font-mono text-[11px]">api/</code>, so
          it only works on the Vercel deployment. GitHub Pages serves the same app but cannot run
          them, and every admin call there will 404.
        </p>
        <div className="flex gap-2">
          <button className="btn btn-primary text-xs" onClick={onRetry}>
            Try again
          </button>
          <Link className="btn text-xs" to="/app">
            Dashboard
          </Link>
        </div>
      </Shell>
    )
  }

  if (state.phase !== 'ready') return null
  const { who } = state

  if (!who.emailVerified) {
    return (
      <Shell title="Verify your email address">
        <p className="text-[12px] text-muted">
          <span className="font-mono text-[11px]">{who.email}</span> has not been verified, and the
          admin list is matched against a verified address only — an unverified one is just a string
          somebody typed.
        </p>
        <button className="btn btn-primary text-xs" onClick={onRetry}>
          I have verified it — check again
        </button>
      </Shell>
    )
  }

  // The real case, and the one that used to be invisible: signed in, verified,
  // and simply not the address the server is configured to let through.
  return (
    <Shell title={`This account cannot open ${surface}`}>
      <p className="text-[12px] text-muted">
        You are signed in as <span className="font-mono text-[11px]">{who.email}</span>, and that is
        not the address this deployment admits to {surface}.
      </p>
      {/* You asked for this page by name, so the detail is warranted here even
          though the account page withholds it. */}
      <AccessFacts state={state} showRoles />
      {need === 'super' && who.isAdmin && (
        <p className="text-[11px] text-muted">
          You do have <code className="font-mono text-[11px]">/admin</code>. The two are separate on
          purpose, so the admin list can grow without also handing over the signup and usage view.
        </p>
      )}
      <p className="text-[11px] text-muted">
        If this is the wrong account, sign out and sign back in with the admin address. If it is the
        right one, set <code className="font-mono text-[11px]">ADMIN_EMAILS</code> to it in the
        host's environment variables and redeploy.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-primary text-xs" to="/account">
          Account &amp; sign out
        </Link>
        {who.isAdmin && need === 'super' && (
          <Link className="btn text-xs" to="/admin">
            Open /admin
          </Link>
        )}
        <Link className="btn text-xs" to="/app">
          Dashboard
        </Link>
      </div>
    </Shell>
  )
}

/**
 * Shown while the Clerk session is still resolving, and — after a few seconds —
 * what to do if it never does.
 *
 * Clerk fetches its script from the instance's own domain. When a network, an
 * extension or a privacy blocker stops that request, `isLoaded` simply stays
 * false and the page sat on "Checking your account…" indefinitely with nothing
 * to click. A spinner that never ends looks exactly like a broken route.
 */
export function CheckingAccount({ stalled }: { stalled: boolean }) {
  if (!stalled) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted">Checking your account…</p>
      </div>
    )
  }
  return (
    <Shell title="Still checking your account">
      <p className="text-[12px] text-muted">
        Clerk's script has not finished loading, so the session cannot be read yet. It is usually a
        privacy extension or a network blocking the request rather than anything in the app.
      </p>
      <p className="text-[11px] text-muted">
        Worth trying, in order: reload; open the page in a private window with extensions off; check
        the browser console for <code className="font-mono text-[11px]">failed_to_load_clerk_js</code>
        .
      </p>
      <div className="flex gap-2">
        <button className="btn btn-primary text-xs" onClick={() => window.location.reload()}>
          Reload
        </button>
        <Link className="btn text-xs" to="/app">
          Dashboard
        </Link>
      </div>
    </Shell>
  )
}
