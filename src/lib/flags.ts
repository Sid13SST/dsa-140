/**
 * Build-time switches.
 *
 * PAYMENTS_ENABLED is off for now. With it off the app needs no serverless
 * functions and no service-role key: signing in is enough, and every read the
 * client makes is authorised by Row Level Security in Postgres rather than by
 * an endpoint of ours. Turning it on re-enables /plans, the Razorpay flow and
 * the has_paid gate, all of which are already written and tested.
 *
 * Read as a string comparison rather than a truthiness check, because Vite
 * inlines env vars as strings — the literal "false" is truthy.
 */
export const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'
