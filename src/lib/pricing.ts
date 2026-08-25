/**
 * Display-only pricing.
 *
 * The number that actually gets charged lives in api/_lib/env.ts and is decided
 * server-side when the order is created. This constant exists so the landing
 * page and the plans page agree with each other — if a client-supplied amount
 * could reach Razorpay, anyone could pay one rupee.
 */
export const PRICE_RUPEES = 20
export const PRICE_PAISE = PRICE_RUPEES * 100
