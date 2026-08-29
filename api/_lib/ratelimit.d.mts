/** Types for ratelimit.mjs — see the note in claims.d.mts on why these are hand-written. */

export interface HitResult {
  ok: boolean
  remaining: number
  /** Epoch ms when this window rolls over. */
  resetAt: number
  retryAfterSeconds: number
}

export declare function hit(
  key: string,
  options?: { limit?: number; windowMs?: number; now?: number },
): HitResult

export declare function clientIp(headers: Record<string, unknown>): string
export declare function _reset(): void
