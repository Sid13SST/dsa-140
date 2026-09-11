import { useCallback, useEffect, useState } from 'react'
import { apiFetch, AuthExpiredError, useAuth } from './auth'

/**
 * What the SERVER thinks of the person holding this session.
 *
 * The whole reason this exists: the browser decides whether to draw /admin from
 * a constant compiled into its own bundle, and the server decides whether to
 * serve it from environment variables it alone can read. Those two are supposed
 * to agree. When they do not — a different address signed in, ADMIN_EMAILS set
 * to something else on the host, an unverified email — the old code just sent
 * the user to /app with no message at all, which is indistinguishable from the
 * page being broken.
 *
 * So: ask the server, and say what it answered.
 */
export interface WhoAmI {
  email: string
  emailVerified: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  sessionId: string
  tokenAgeMs: number
  server: {
    adminListConfigured: boolean
    authorizedPartiesConfigured: boolean
  }
  verdict: string
}

export type AccessState =
  /** Waiting for the session, or for the server to answer. */
  | { phase: 'loading' }
  /** The server answered. `who` is its verdict, and it is the authority. */
  | { phase: 'ready'; who: WhoAmI }
  /** The session itself is no longer good — sign in again. */
  | { phase: 'expired'; message: string }
  /**
   * The question could not be asked: no functions on this deployment, offline,
   * a 500. Distinct from a refusal, because the answer is unknown rather than
   * "no", and the UI must not imply the user was turned away.
   */
  | { phase: 'unreachable'; message: string }
  /** Auth is switched off in this build, so there is no session to describe. */
  | { phase: 'no-auth' }

/**
 * Ask /api/whoami who the server thinks we are.
 *
 * Deliberately never throws and never redirects. Its whole job is to turn every
 * possible failure into something a person can read.
 */
export function useAccess(): { state: AccessState; recheck: () => void } {
  const { status, getToken } = useAuth()
  const [state, setState] = useState<AccessState>({ phase: 'loading' })
  const [nonce, setNonce] = useState(0)

  const recheck = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (status === 'unconfigured') {
      setState({ phase: 'no-auth' })
      return
    }
    if (status !== 'signed-in') {
      setState({ phase: 'loading' })
      return
    }

    let live = true
    setState({ phase: 'loading' })
    apiFetch<WhoAmI>('/api/whoami', getToken)
      .then((who) => {
        if (live) setState({ phase: 'ready', who })
      })
      .catch((e: unknown) => {
        if (!live) return
        if (e instanceof AuthExpiredError) {
          setState({ phase: 'expired', message: e.message })
          return
        }
        setState({
          phase: 'unreachable',
          message: e instanceof Error ? e.message : 'Could not reach the server',
        })
      })
    return () => {
      live = false
    }
  }, [status, getToken, nonce])

  return { state, recheck }
}
