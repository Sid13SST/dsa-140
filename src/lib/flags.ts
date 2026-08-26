/**
 * Build-time switches.
 *
 * PAYMENTS_ENABLED is off for now. With it off the app needs no serverless
 * functions and no service-role key: signing in is enough, and every read the
 * signing in is enough. Turning it on re-enables /plans, the Razorpay flow and
 * the hasPaid gate, all of which are already written and tested.
 *
 * Read as a string comparison rather than a truthiness check, because Vite
 * inlines env vars as strings — the literal "false" is truthy.
 */
export const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'

/**
 * Whether the dashboard requires an account at all.
 *
 * Off by default, so the app works the way it did before any of this existed:
 * open /app and start, with progress in localStorage. Accounts are only worth
 * their setup cost once there is something to sync or someone to charge, and
 * until then a sign-in wall is just a thing standing between you and the work.
 *
 * Everything auth-related stays wired and tested behind this — set it to true
 * once VITE_CLERK_PUBLISHABLE_KEY is set.
 */
export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true'
