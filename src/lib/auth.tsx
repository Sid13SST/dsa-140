import { useCallback, useMemo } from 'react'
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react'
import { clerkConfigured, isAdminEmail } from './clerk'
import { iso } from './dates'
import { AUTH_ENABLED, PAYMENTS_ENABLED } from './flags'

/**
 * The app's view of who you are.
 *
 * Deliberately the same shape it had under Supabase, so Protected, Admin and
 * Landing did not need rewriting when the provider changed. That is the point
 * of having a wrapper at all.
 *
 * Nothing here is an access decision. It decides what the UI SHOWS; the server
 * decides what it SERVES, by verifying the session token on every request.
 */
export interface Me {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  hasPaid: boolean
  paidAt: string | null
  isAdmin: boolean
  /**
   * The local calendar day the account was created — the day you signed in for
   * the first time. The 140-day run is dated from it, so it is a day string
   * rather than an instant: which side of midnight you were on is the only
   * part that matters.
   */
  signedUpOn: string | null
}

type Status = 'loading' | 'signed-out' | 'signed-in' | 'unconfigured'

export interface AuthValue {
  status: Status
  me: Me | null
  error: string | null
  signOut: () => Promise<void>
  /** Token for calling our own /api endpoints. Null when signed out. */
  getToken: () => Promise<string | null>
  refresh: () => Promise<void>
}

/** Used when auth is switched off, or no publishable key is configured. */
function useDisabledAuth(): AuthValue {
  return useMemo(
    () => ({
      status: 'unconfigured' as const,
      me: null,
      error: null,
      signOut: async () => {},
      getToken: async () => null,
      refresh: async () => {},
    }),
    [],
  )
}

function useClerkBackedAuth(): AuthValue {
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useClerkAuth()
  const clerk = useClerk()

  const signOut = useCallback(async () => {
    await clerk.signOut()
  }, [clerk])

  // Clerk keeps the user object live, so there is nothing to re-fetch. Kept in
  // the interface because callers still render a "try again" button.
  const refresh = useCallback(async () => {}, [])

  const me = useMemo<Me | null>(() => {
    if (!isSignedIn || !user) return null
    const email = user.primaryEmailAddress?.emailAddress ?? ''
    /*
     * hasPaid lives in Clerk's publicMetadata, written only by the server with
     * the secret key — the browser can read it and cannot set it. With payments
     * off nobody is gated, so the flag is irrelevant and everyone passes.
     */
    const paid = (user.publicMetadata as { hasPaid?: boolean; paidAt?: string }) ?? {}
    return {
      id: user.id,
      email,
      fullName: user.fullName,
      avatarUrl: user.imageUrl ?? null,
      hasPaid: PAYMENTS_ENABLED ? !!paid.hasPaid : true,
      paidAt: paid.paidAt ?? null,
      isAdmin: isAdminEmail(email),
      signedUpOn: user.createdAt ? iso(new Date(user.createdAt)) : null,
    }
  }, [isSignedIn, user])

  const status: Status = !isLoaded ? 'loading' : isSignedIn ? 'signed-in' : 'signed-out'

  return useMemo(
    () => ({ status, me, error: null, signOut, getToken, refresh }),
    [status, me, signOut, getToken, refresh],
  )
}

/**
 * Picked ONCE, at module load.
 *
 * Clerk's hooks throw when ClerkProvider is not mounted, and it is not mounted
 * while auth is switched off. Choosing between the two implementations here
 * rather than with an `if` inside the hook keeps the hook order identical on
 * every render, which is what the rules of hooks actually require. Both flags
 * are build-time constants, so this can never change while the app is running.
 */
export const useAuth: () => AuthValue =
  AUTH_ENABLED && clerkConfigured ? useClerkBackedAuth : useDisabledAuth

/** Thrown when the server says the session is no longer good. */
export class AuthExpiredError extends Error {
  constructor(message = 'Your session has expired. Sign in again.') {
    super(message)
    this.name = 'AuthExpiredError'
  }
}

/** How long any call to our own API may take before it is abandoned. */
const API_TIMEOUT_MS = 15_000

/**
 * Call one of our serverless functions with the caller's session attached.
 *
 * The token is a Clerk JWT with a ~60-second life, fetched fresh on every call
 * rather than held anywhere: there is no copy of it in localStorage, in a
 * module variable, or in a closure that outlives the request. Clerk keeps the
 * session in its own httpOnly cookie, so the only thing this code ever touches
 * is a short-lived token it immediately spends.
 *
 * `credentials: 'omit'` is deliberate and load-bearing. This API authenticates
 * from the Authorization header ONLY, and sending no cookies makes that
 * structural: a cross-site request cannot forge a header, so there is no CSRF
 * surface to defend. It also means a stray cookie can never be mistaken for
 * proof of anything.
 */
export async function apiFetch<T>(
  path: string,
  getToken: () => Promise<string | null>,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken()
  if (!token) throw new AuthExpiredError('You are not signed in.')

  // A hung request should fail as a request, not as a spinner that never stops.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.headers ?? {}),
        // Last, so nothing passed by a caller can overwrite the credential.
        Authorization: `Bearer ${token}`,
      },
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('That took too long. Check your connection and try again.')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // Usually an HTML error page from the host. Say something useful rather
    // than surfacing a JSON parse error.
    throw new Error(
      res.status === 404
        ? 'This endpoint is not available on this deployment — it needs the Vercel build, which runs the api/ functions.'
        : `Server returned ${res.status}`,
    )
  }

  if (!res.ok) {
    const message = (body as { error?: string })?.error || `Server returned ${res.status}`
    /*
     * 401 means the server rejected the session itself — expired, revoked,
     * minted for another origin. It is not a failed request to retry with the
     * same token; the caller has to send the user back through sign-in, so it
     * gets its own type rather than being one more string to string-match.
     */
    if (res.status === 401) throw new AuthExpiredError(message)
    throw new Error(message)
  }
  return body as T
}
