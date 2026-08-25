import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authConfigured, supabase } from './supabase'
import { PAYMENTS_ENABLED } from './flags'

/**
 * Who the database says you are.
 *
 * Everything here is read straight from Supabase with the anon key. That is
 * safe — and is the whole design — because Row Level Security decides what the
 * key can reach:
 *
 *   profiles  a policy returns your own row, and every row if you are an admin
 *   admins    a policy returns rows ONLY to admins, so a non-empty result is
 *             itself the answer to "am I an admin"
 *   has_paid  readable, but writable only by the service-role key, and a
 *             trigger rejects the write outright if anyone else tries
 *
 * So the checks happen in Postgres, not in React. Editing this file, or the
 * state it produces, changes what you SEE and not what the database will hand
 * over. That is why no serverless function is needed while payments are off.
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
  /** Set when the profile could not be read — shown rather than assumed away. */
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
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

    // Fires on sign-in, sign-out and silent token refreshes.
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
    if (!supabase || !session?.user) {
      setMe(null)
      return
    }
    const user = session.user
    try {
      setError(null)

      const [profileRes, adminRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('email, full_name, avatar_url, has_paid, paid_at')
          .eq('id', user.id)
          .maybeSingle(),
        // A row comes back only if the policy lets it, so this IS the check.
        supabase.from('admins').select('email').limit(1),
      ])

      if (profileRes.error) throw new Error(profileRes.error.message)

      setMe({
        id: user.id,
        email: user.email ?? '',
        fullName: profileRes.data?.full_name ?? (user.user_metadata?.full_name as string) ?? null,
        avatarUrl: profileRes.data?.avatar_url ?? (user.user_metadata?.avatar_url as string) ?? null,
        // With payments off nobody is gated, so the column is irrelevant.
        hasPaid: PAYMENTS_ENABLED ? !!profileRes.data?.has_paid : true,
        paidAt: profileRes.data?.paid_at ?? null,
        isAdmin: !adminRes.error && (adminRes.data?.length ?? 0) > 0,
      })

      // Presence, so the admin page can show who is actually active. Best
      // effort — a failure here must not block signing in.
      void supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id)
    } catch (e) {
      // Never fall back to "allowed" on error. Failing closed is the point.
      setMe(null)
      setError(
        e instanceof Error
          ? `${e.message}. If this persists, the database schema may not have been applied yet.`
          : 'Could not load your account',
      )
    }
  }, [session])

  useEffect(() => {
    void loadMe()
  }, [loadMe])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Authentication is not configured yet')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Land on the dashboard directly when there is no payment step.
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}${
          PAYMENTS_ENABLED ? 'plans' : 'app'
        }`,
      },
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
