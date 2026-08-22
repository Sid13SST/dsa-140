import { supabase } from './supabase'

export const ADMIN_EMAIL = 'siddhant.prasad8@gmail.com'
export const ACCESS_PRICE_PAISE = 2000

export interface Profile {
  id: string
  email: string
  role: 'user' | 'admin'
  has_paid: boolean
  paid_at: string | null
  created_at: string
  last_seen_at: string | null
}

export interface AdminUserRow {
  id: string
  email: string
  role: string
  has_paid: boolean
  paid_at: string | null
  created_at: string
  last_seen_at: string | null
  login_count: number
  last_login_at: string | null
  total_paid_paise: number
}

export interface LoginEvent {
  id: number
  user_id: string
  email: string
  occurred_at: string
  user_agent: string | null
}

export interface PaymentRow {
  id: string
  email: string
  razorpay_order_id: string
  razorpay_payment_id: string | null
  amount_paise: number
  currency: string
  status: string
  created_at: string
  paid_at: string | null
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

/** Records a sign-in for the admin "who logged in" view. Best-effort. */
export async function recordLogin(userId: string, email: string) {
  if (!supabase) return
  try {
    await supabase
      .from('login_events')
      .insert({ user_id: userId, email, user_agent: navigator.userAgent })
  } catch {
    // Never block sign-in on analytics.
  }
}

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function createOrder(): Promise<{
  orderId: string
  amount: number
  currency: string
  keyId: string
}> {
  const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body?.error ?? 'Could not start payment')
  return body
}

export async function verifyPayment(payload: {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}): Promise<void> {
  const res = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(payload),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body?.error ?? 'Payment verification failed')
}

/* ------------------------------ admin queries ----------------------------- */

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('admin_users_overview')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as AdminUserRow[]) ?? []
}

export async function fetchLoginEvents(limit = 100): Promise<LoginEvent[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('login_events')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as LoginEvent[]) ?? []
}

export async function fetchPayments(): Promise<PaymentRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as PaymentRow[]) ?? []
}
