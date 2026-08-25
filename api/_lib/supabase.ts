import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './env'

/**
 * The service-role client. Bypasses Row Level Security, so it exists only
 * inside serverless functions and is the ONLY thing allowed to set has_paid.
 */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL(), SUPABASE_SERVICE_ROLE_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface AuthedUser {
  id: string
  email: string
}

/**
 * Verify the caller's access token with Supabase and return the user.
 *
 * The token is checked against Supabase on every request rather than decoded
 * locally: a locally-decoded JWT tells you what the holder claims, not whether
 * the session is still valid.
 */
export async function requireUser(req: { headers: Record<string, unknown> }): Promise<AuthedUser> {
  const header = String(req.headers['authorization'] ?? req.headers['Authorization'] ?? '')
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new HttpError(401, 'Not signed in')

  const { data, error } = await adminClient().auth.getUser(token)
  if (error || !data?.user?.email) throw new HttpError(401, 'Session is not valid')
  return { id: data.user.id, email: data.user.email }
}

/** True when this email is listed in the admins table. Never trusted from the client. */
export async function isAdmin(email: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from('admins')
    .select('email')
    .ilike('email', email)
    .maybeSingle()
  if (error) return false
  return !!data
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Uniform error handling, so a thrown HttpError never leaks a stack trace. */
export function fail(res: { status: (n: number) => { json: (b: unknown) => void } }, e: unknown) {
  if (e instanceof HttpError) {
    res.status(e.status).json({ error: e.message })
    return
  }
  console.error(e)
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
}
