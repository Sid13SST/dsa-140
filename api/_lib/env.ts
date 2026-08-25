/**
 * Server-side environment access.
 *
 * Every name here is a SERVER secret. None of them may ever be prefixed with
 * VITE_, because anything so prefixed is compiled into the browser bundle and
 * is therefore public. The key_id and the Supabase URL/anon key are the only
 * values safe to expose, and those live on the client side under VITE_.
 */
export function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    // Fail loudly at call time rather than silently behaving as if unpaid.
    throw new Error(`Missing environment variable ${name}`)
  }
  return value
}

export const RAZORPAY_KEY_ID = () => required('VITE_RAZORPAY_KEY_ID')
export const RAZORPAY_KEY_SECRET = () => required('RAZORPAY_KEY_SECRET')
export const RAZORPAY_WEBHOOK_SECRET = () => required('RAZORPAY_WEBHOOK_SECRET')
export const SUPABASE_URL = () => required('VITE_SUPABASE_URL')
export const SUPABASE_SERVICE_ROLE_KEY = () => required('SUPABASE_SERVICE_ROLE_KEY')

/** The price, in paise, defined server-side so the client cannot choose it. */
export const PRICE_PAISE = 2000
export const CURRENCY = 'INR'
