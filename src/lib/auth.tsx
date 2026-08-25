import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { api, authConfigured, supabase } from './supabase'

/**
 * Who the server says you are.
 *
 * Deliberately fetched from /api/me rather than read out of the JWT. The token
 * says who you are; only the database knows whether you have paid, and that is
 * the field worth lying about. Nothing in this file is an access decision — the
 * routes use it for what to SHOW, while the server decides what to SERVE.
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

interface AuthValue {
  status: Status
  session: Session | null
  me: Me | null
  /** Set when /api/me failed — shown instead of silently treating you as unpaid. */
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  /** Re-ask the server. Called after a payment lands. */
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(!authConfigured)

  useEffect(() => {
    if (!supabase) return
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setReady(true)
    })

    // Fires on sign-in, sign-out, and silent token refreshes.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!alive) return
      setSession(next)
      if (!next) setMe(null)
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const loadMe = useCallback(async () => {
    if (!session) {
      setMe(null)
      return
    }
    try {
      setError(null)
      setMe(await api<Me>('/api/me'))
    } catch (e) {
      // Do NOT fall back to "paid" on error. Failing closed is the whole point.
      setMe(null)
      setError(e instanceof Error ? e.message : 'Could not load your account')
    }
  }, [session])

  useEffect(() => {
    void loadMe()
  }, [loadMe])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Authentication is not configured yet')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/plans` },
    })
    if (err) throw new Error(err.message)
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setMe(null)
  }, [])

  const status: Status = !authConfigured
    ? 'unconfigured'
    : !ready
      ? 'loading'
      : session
        ? 'signed-in'
        : 'signed-out'

  const value = useMemo(
    () => ({ status, session, me, error, signInWithGoogle, signOut, refresh: loadMe }),
    [status, session, me, error, signInWithGoogle, signOut, loadMe],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}
