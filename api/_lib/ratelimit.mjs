/**
 * A fixed-window rate limiter, in memory.
 *
 * HONEST ABOUT WHAT THIS IS. Serverless functions scale horizontally, so this
 * counts per warm instance, not per deployment: someone determined enough to
 * spread requests across cold starts gets a multiple of the limit. It is a
 * speed bump against credential stuffing, admin-endpoint probing and a stuck
 * client hammering a loop — not a wall against a distributed attacker.
 *
 * The wall for that is upstream and already in place: Clerk's bot protection
 * and lockout on the sign-in side, and the platform's own DDoS handling on the
 * edge. What this adds is a cheap, local ceiling on the endpoints that reach
 * Clerk's Backend API or Razorpay, so one caller cannot burn the account's
 * quota for everyone.
 *
 * If it ever needs to be exact, the shape below is deliberately one function:
 * swap the Map for a Redis INCR with an expiry and nothing else changes.
 */

/** key -> { count, resetAt }. Bounded; see the sweep in `hit`. */
const windows = new Map()

/** Never let the map grow without bound — an attacker choosing keys is the point. */
const MAX_KEYS = 10_000

function sweep(now) {
  if (windows.size < MAX_KEYS) return
  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) windows.delete(key)
  }
  // Still full of live windows: this is a flood, so drop the oldest half rather
  // than let the instance's memory be someone else's resource to grow.
  if (windows.size >= MAX_KEYS) {
    const half = Math.floor(windows.size / 2)
    let dropped = 0
    for (const key of windows.keys()) {
      windows.delete(key)
      if (++dropped >= half) break
    }
  }
}

/**
 * Count one request against `key`.
 *
 * @returns { ok, remaining, resetAt, retryAfterSeconds }
 */
export function hit(key, { limit = 60, windowMs = 60_000, now = Date.now() } = {}) {
  sweep(now)

  const entry = windows.get(key)
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs
    windows.set(key, { count: 1, resetAt })
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSeconds: 0 }
  }

  entry.count += 1
  const remaining = Math.max(0, limit - entry.count)
  const ok = entry.count <= limit
  return {
    ok,
    remaining,
    resetAt: entry.resetAt,
    retryAfterSeconds: ok ? 0 : Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  }
}

/**
 * The caller's address, as far as it can be trusted.
 *
 * `x-forwarded-for` is a chain the client can prepend to, so only the LAST hop
 * — the one the platform's own proxy appended — is meaningful. Taking the first
 * entry, which is the common mistake, lets anyone rotate their own rate-limit
 * key by sending a header.
 */
export function clientIp(headers) {
  const forwarded = headers['x-forwarded-for']
  const chain = Array.isArray(forwarded) ? forwarded.join(',') : String(forwarded ?? '')
  const hops = chain
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (hops.length > 0) return hops[hops.length - 1]

  const real = headers['x-real-ip']
  if (typeof real === 'string' && real.trim()) return real.trim()
  return 'unknown'
}

/** Test seam: forget every window. Not exported to handlers. */
export function _reset() {
  windows.clear()
}
