import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The browser Supabase client.
 *
 * The anon key is PUBLIC by design — it is compiled into the bundle and anyone
 * can read it. That is safe only because Row Level Security decides what it can
 * reach; the key identifies the project, it does not grant access. The
 * service_role key, which does grant access, never appears on this side.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Whether auth is configured at all. Running locally without env vars is a
 * normal state, not a crash: the app falls back to a clear setup message rather
 * than a white screen.
 */
export const authConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = authConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** The access token for the current session, or null. Used as the API bearer. */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/**
 * Call one of our serverless functions with the caller's session attached.
 *
 * Errors come back as thrown Errors carrying the server's message, so callers
 * can show something useful instead of "failed to fetch".
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken()
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
    // A non-JSON response is a real failure mode — an HTML error page from the
    // host, say — and deserves a clearer message than a parse error.
    throw new Error(`Server returned ${res.status}`)
  }

  if (!res.ok) {
    const message = (body as { error?: string })?.error
    throw new Error(message || `Server returned ${res.status}`)
  }
  return body as T
}
