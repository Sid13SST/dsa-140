import { createClient } from '@supabase/supabase-js'

/**
 * Server-only helpers. Everything here runs in Vercel functions — never in the
 * browser — so it may touch the Razorpay secret and the Supabase service-role
 * key. Nothing in this file may be imported from src/.
 */

export const ACCESS_PRICE_PAISE = 2000 // Rs 20.00
export const ADMIN_EMAIL = 'siddhant.prasad8@gmail.com'

export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required environment variable: ${name}`)
  return v
}

/** Service-role client: bypasses RLS, so it must only ever run server-side. */
export function serviceClient() {
  return createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

/**
 * Resolves the caller from their Supabase access token. Returning the user from
 * the token (rather than trusting a user id in the request body) is what stops
 * one account from buying access for another.
 */
export async function userFromRequest(authHeader: string | undefined) {
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const anon = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}
