import { useCallback, useMemo } from 'react'
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react'
import { clerkConfigured, isAdminEmail } from './clerk'
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

/**
 * Call one of our serverless functions with the caller's session attached.
 *
 * The token is a short-lived Clerk JWT. The server verifies it against Clerk's
 * public keys, so a forged or expired one is rejected before any handler runs.
 */
export async function apiFetch<T>(
  path: string,
  getToken: () => Promise<string | null>,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken()
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })

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
    throw new Error((body as { error?: string })?.error || `Server returned ${res.status}`)
  }
  return body as T
}
