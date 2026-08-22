import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Progress } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Null when env vars are absent — the app then runs in local-only mode. */
export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null

export const cloudEnabled = supabase !== null

export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error('Cloud sync is not configured.')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href },
  })
  if (error) throw error
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function fetchProgress(userId: string): Promise<Progress | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('progress')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data?.data as Progress) ?? null
}

export async function pushProgress(userId: string, progress: Progress) {
  if (!supabase) return
  const { error } = await supabase
    .from('progress')
    .upsert({ user_id: userId, data: progress, updated_at: new Date().toISOString() })
  if (error) throw error
}
